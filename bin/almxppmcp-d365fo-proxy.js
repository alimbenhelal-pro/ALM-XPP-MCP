#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const readline = require('readline');

const CLOUD_PROXY_URL = process.env.D365FO_PROXY_URL || '';
const CLOUD_PROXY_API_KEY = process.env.D365FO_PROXY_API_KEY || process.env.ALMXPPMCP_API_KEY || '';
const MCP_URL = process.env.D365FO_MCP_URL || process.env.D365_MCP_URL;
const RESOURCE = process.env.D365FO_RESOURCE || process.env.D365_RESOURCE;
const TENANT_ID = process.env.D365FO_TENANT_ID || process.env.AZURE_TENANT_ID || '';
const SESSION_HEADER = 'mcp-session-id';
const TOKEN_REFRESH_INTERVAL_MS = 45 * 60 * 1000;
const USE_CLOUD_PROXY = Boolean(CLOUD_PROXY_URL);

if (!USE_CLOUD_PROXY && (!MCP_URL || !RESOURCE)) {
  process.stderr.write(
    '[almxppmcp-d365fo-proxy] ERROR: D365FO_MCP_URL and D365FO_RESOURCE are required.\n' +
    'Example:\n' +
    '  D365FO_MCP_URL=https://your-env.sandbox.operations.dynamics.com/mcp\n' +
    '  D365FO_RESOURCE=https://your-env.sandbox.operations.dynamics.com\n'
  );
  process.exit(1);
}

if (USE_CLOUD_PROXY && !CLOUD_PROXY_API_KEY) {
  process.stderr.write(
    '[almxppmcp-d365fo-proxy] ERROR: D365FO_PROXY_API_KEY or ALMXPPMCP_API_KEY is required in cloud mode.\n'
  );
  process.exit(1);
}

if (typeof fetch !== 'function') {
  process.stderr.write(
    '[almxppmcp-d365fo-proxy] ERROR: This script requires Node.js 18+ with native fetch support.\n'
  );
  process.exit(1);
}

function buildTokenArgs() {
  const args = ['account', 'get-access-token', '--resource', RESOURCE, '--query', 'accessToken', '-o', 'tsv'];
  if (TENANT_ID) {
    args.push('--tenant', TENANT_ID);
  }
  return args;
}

function getToken() {
  return execFileSync('az', buildTokenArgs(), { encoding: 'utf8' }).replace(/[\r\n]/g, '');
}

let token = null;
if (!USE_CLOUD_PROXY) {
  try {
    token = getToken();
  } catch (error) {
    process.stderr.write(
      `[almxppmcp-d365fo-proxy] ERROR: Unable to acquire Azure CLI token: ${error.message}\n`
    );
    process.exit(1);
  }
}

let sessionId = null;
let pending = Promise.resolve();

if (!USE_CLOUD_PROXY) {
  setInterval(() => {
    try {
      token = getToken();
      process.stderr.write('[almxppmcp-d365fo-proxy] Token refreshed\n');
    } catch (error) {
      process.stderr.write(
        `[almxppmcp-d365fo-proxy] Token refresh failed: ${error.message}\n`
      );
    }
  }, TOKEN_REFRESH_INTERVAL_MS);
}

async function forwardMessage(message, allowRetry) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };

  if (USE_CLOUD_PROXY) {
    headers['X-API-Key'] = CLOUD_PROXY_API_KEY;
    if (MCP_URL) {
      headers['X-D365FO-MCP-URL'] = MCP_URL;
    }
    if (RESOURCE) {
      headers['X-D365FO-RESOURCE'] = RESOURCE;
    }
  } else {
    headers.Authorization = `Bearer ${token}`;
  }

  if (sessionId) {
    headers[SESSION_HEADER] = sessionId;
  }

  const response = await fetch(USE_CLOUD_PROXY ? CLOUD_PROXY_URL : MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });

  if (!USE_CLOUD_PROXY && response.status === 401 && allowRetry) {
    token = getToken();
    return forwardMessage(message, false);
  }

  const newSessionId = response.headers.get(SESSION_HEADER);
  if (newSessionId) {
    sessionId = newSessionId;
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.trim() || response.statusText}`);
  }

  if (contentType.includes('text/event-stream')) {
    for (const chunk of text.split(/\r?\n/)) {
      if (!chunk.startsWith('data:')) {
        continue;
      }

      const data = chunk.slice(5).trim();
      if (data) {
        process.stdout.write(`${data}\n`);
      }
    }
    return;
  }

  if (text.trim()) {
    process.stdout.write(`${text.trim()}\n`);
  }
}

function writeRpcError(rawLine, error) {
  let parsed;
  try {
    parsed = JSON.parse(rawLine);
  } catch {
    parsed = null;
  }

  if (!parsed || parsed.id === undefined) {
    process.stderr.write(`[almxppmcp-d365fo-proxy] Error: ${error.message}\n`);
    return;
  }

  process.stdout.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: parsed.id,
      error: {
        code: -32000,
        message: `Proxy error: ${error.message}`,
      },
    })}\n`
  );
}

async function handleLine(line) {
  if (!line.trim()) {
    return;
  }

  try {
    const message = JSON.parse(line);
    await forwardMessage(message, true);
  } catch (error) {
    writeRpcError(line, error);
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  pending = pending.then(() => handleLine(line));
});

rl.on('close', () => {
  process.stderr.write('[almxppmcp-d365fo-proxy] stdin closed, waiting for pending requests...\n');
  pending.finally(() => {
    setTimeout(() => process.exit(0), 250);
  });
});

process.stderr.write(
  `[almxppmcp-d365fo-proxy] Ready (${USE_CLOUD_PROXY ? 'cloud' : 'local'}): ${USE_CLOUD_PROXY ? CLOUD_PROXY_URL : MCP_URL}\n`
);