#!/usr/bin/env node
// ============================================================
//  almxppmcp -- npx launcher
//  Bridges a stdio-only MCP client (Claude Desktop and the like)
//  to the ALM XPP Cloud MCP over HTTP.
//
//  Clients that speak HTTP should skip this entirely and point
//  at https://api.almxpp.com/mcp directly -- see the README.
//
//  Usage:
//    npx almxppmcp --api-key <YOUR_TOKEN>
//    ALMXPPMCP_API_KEY=<YOUR_TOKEN> npx almxppmcp
// ============================================================

'use strict';

// fetch became global in Node 18, and the whole bridge rests on it.
if (typeof fetch !== 'function') {
  process.stderr.write(
    `[almxppmcp] ERROR: Node 18 or newer is required (found ${process.version}).\n`
  );
  process.exit(1);
}

// -- 1. Resolve API key ------------------------------------
let apiKey = process.env.ALMXPPMCP_API_KEY || '';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--api-key' || args[i] === '-k') && args[i + 1]) {
    apiKey = args[i + 1];
    i++;
  } else if (args[i].startsWith('--api-key=')) {
    apiKey = args[i].split('=').slice(1).join('=');
  }
}

if (!apiKey) {
  process.stderr.write(
    '[almxppmcp] ERROR: No API key provided.\n' +
    '  Pass it via --api-key <token>  or  set ALMXPPMCP_API_KEY env var.\n' +
    '  Get your token at: https://almxpp.com/account/dashboard\n'
  );
  process.exit(1);
}

// -- 2. Resolve server URL ----------------------------------
const SERVER_URL =
  process.env.ALMXPPMCP_SERVER_URL ||
  'https://api.almxpp.com/mcp';

// -- 3. Build the outgoing headers --------------------------
//  The header names on the right are the ONLY spellings the server reads -- they are
//  case-sensitive and must match McpSessionHeaderCache.TrackedHeaders, ResolveSetting
//  (D365FO-*) and ResolveAiSetting (AppInsights-*) exactly.
const envHeaders = {
  'DEVOPS_ORG_URL':             'DEVOPS_ORG_URL',
  'DEVOPS_PAT':                 'DEVOPS_PAT',
  'DEVOPS_PROJECT':             'DEVOPS_PROJECT',
  'DEVOPS_REPO':                'DEVOPS_REPO',
  'DEVOPS_BRANCH':              'DEVOPS_BRANCH',
  'DEVOPS_METADATA_PATH':       'DEVOPS_METADATA_PATH',
  'D365_CUSTOM_MODEL_PATH':     'D365-Custom-Model-Path',
  'D365_STANDARD_MODEL_PATH':   'D365-Standard-Model-Path',
  'D365FO_URL':                 'D365FO-Url',
  'D365FO_TENANT_ID':           'D365FO-Tenant-Id',
  'D365FO_CLIENT_ID':           'D365FO-Client-Id',
  'D365FO_CLIENT_SECRET':       'D365FO-Client-Secret',
  'APPINSIGHTS_WORKSPACE_ID':   'AppInsights-Workspace-Id',
  'APPINSIGHTS_TENANT_ID':      'AppInsights-Tenant-Id',
  'APPINSIGHTS_CLIENT_ID':      'AppInsights-Client-Id',
  'APPINSIGHTS_CLIENT_SECRET':  'AppInsights-Client-Secret',
};

const extraHeaders = {};
for (const [envKey, headerName] of Object.entries(envHeaders)) {
  if (process.env[envKey]) extraHeaders[headerName] = process.env[envKey];
}

// CLI equivalents for the two path headers. A flag wins over the matching env var.
for (const [flag, headerName] of Object.entries({
  '--model-path':          'D365-Custom-Model-Path',
  '--standard-model-path': 'D365-Standard-Model-Path',
})) {
  const i = args.indexOf(flag);
  const inline = args.find((a) => a.startsWith(flag + '='));
  const value = i >= 0 && args[i + 1] ? args[i + 1]
    : inline ? inline.slice(flag.length + 1)
    : null;
  if (value) extraHeaders[headerName] = value;
}

// -- 4. Session --------------------------------------------
//  The server issues no Mcp-Session-Id: it keys a session on the API key itself. What does
//  need carrying is the Container Apps affinity cookie, so every request of a session lands
//  on the replica holding its cached headers.
const cookies = new Map();

function rememberCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  for (const c of raw) {
    const pair = String(c).split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function requestHeaders() {
  const h = {
    'Content-Type': 'application/json',
    'Accept':       'application/json, text/event-stream',
    'X-API-Key':    apiKey,
    ...extraHeaders,
  };
  if (cookies.size) {
    h['Cookie'] = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  return h;
}

// One write per message keeps lines from interleaving when concurrent requests land together.
function writeLine(payload) {
  if (!payload) return;
  // SSE lets one payload span several data: lines, but the stdio framing here is one JSON
  // object per line -- emitting the newline as-is would split a single reply into two messages.
  let line = payload;
  if (line.indexOf('\n') >= 0) {
    try { line = JSON.stringify(JSON.parse(line)); }
    catch (err) { line = line.replace(/\r?\n/g, ' '); }
  }
  process.stdout.write(line + '\n');
}

// -- 5. Read the server's reply ----------------------------
//  Requests come back as text/event-stream; notifications as 202 with no body.
async function readSse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let data = [];

  const flush = () => {
    if (data.length) writeLine(data.join('\n'));
    data = [];
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);

      if (line === '') { flush(); continue; }
      if (line.startsWith(':')) continue;            // keep-alive comment

      const sep = line.indexOf(':');
      const field = sep < 0 ? line : line.slice(0, sep);
      let payload = sep < 0 ? '' : line.slice(sep + 1);
      if (payload.startsWith(' ')) payload = payload.slice(1);
      if (field === 'data') data.push(payload);
    }
  }
  flush();
}

function replyError(msg, message) {
  // Without a reply the client waits on this id forever, so answer even when the transport failed.
  if (msg && msg.id !== undefined && msg.id !== null) {
    writeLine(JSON.stringify({
      jsonrpc: '2.0',
      id: msg.id,
      error: { code: -32603, message: `[almxppmcp] ${message}` },
    }));
  }
  process.stderr.write(`[almxppmcp] ${message}\n`);
}

async function forward(msg) {
  let res;
  try {
    res = await fetch(SERVER_URL, {
      method:  'POST',
      headers: requestHeaders(),
      body:    JSON.stringify(msg),
    });
  } catch (err) {
    replyError(msg, `request failed: ${err.message}`);
    return;
  }

  rememberCookies(res);

  if (res.status === 202 || res.status === 204) {
    if (res.body) await res.body.cancel().catch(() => {});
    return;
  }

  const type = res.headers.get('content-type') || '';
  try {
    if (type.includes('text/event-stream')) {
      await readSse(res);
    } else {
      const text = (await res.text()).trim();
      if (!res.ok) { replyError(msg, `HTTP ${res.status}: ${text.slice(0, 300)}`); return; }
      writeLine(text);
    }
  } catch (err) {
    replyError(msg, `reading the response failed: ${err.message}`);
  }
}

// -- 6. stdin ----------------------------------------------
process.stderr.write(`[almxppmcp] Connecting to ${SERVER_URL}\n`);

let inbox = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  inbox += chunk;
  let nl;
  while ((nl = inbox.indexOf('\n')) >= 0) {
    const line = inbox.slice(0, nl).trim();
    inbox = inbox.slice(nl + 1);
    if (!line) continue;

    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      process.stderr.write(`[almxppmcp] Ignoring unparsable line: ${err.message}\n`);
      continue;
    }
    // Not awaited on purpose: a slow tool call must not hold up the messages behind it.
    forward(msg);
  }
});

process.stdin.on('end', () => process.exit(0));
process.stdin.on('error', (err) => {
  process.stderr.write(`[almxppmcp] stdin error: ${err.message}\n`);
  process.exit(1);
});

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => process.exit(0)));
