#!/usr/bin/env node
// ============================================================
//  almxppmcp -- npx launcher
//  Bridges MCP clients (VS Code Copilot, Cursor, Claude, etc.)
//  to the ALM XPP MCP cloud server via mcp-remote.
//
//  Usage:
//    npx almxppmcp --api-key <YOUR_TOKEN>
//    ALMXPPMCP_API_KEY=<YOUR_TOKEN> npx almxppmcp
// ============================================================

'use strict';

const { spawn } = require('child_process');
const path    = require('path');

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

// -- 3. Resolve mcp-remote binary ---------------------------
//  When installed via npm the binary lives inside node_modules/.bin.
//  When run via npx it is resolved automatically.
let mcpRemoteBin;
try {
  // Try local node_modules first (installed package)
  mcpRemoteBin = require.resolve('mcp-remote/bin/mcp-remote.js');
} catch {
  try {
  mcpRemoteBin = require.resolve('.bin/mcp-remote');
  } catch {
    mcpRemoteBin = 'mcp-remote'; // fall back to PATH
  }
}

// -- 4. Build mcp-remote arguments --------------------------
//  mcp-remote <url> [--header <name>:<value>] [--transport <type>]
const mcpArgs = [
  mcpRemoteBin,
  SERVER_URL,
  '--header', `X-API-Key:${apiKey}`,
  '--transport', 'http-first',
];

// Forward optional env vars as HTTP headers (used by cloud server per-session).
// The header names on the right are the ONLY spellings the server reads -- they are
// case-sensitive and must match McpSessionHeaderCache.TrackedHeaders, ResolveSetting
// (D365FO-*) and ResolveAiSetting (AppInsights-*) exactly.
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
for (const [envKey, headerName] of Object.entries(envHeaders)) {
  if (process.env[envKey]) {
    mcpArgs.push('--header', `${headerName}:${process.env[envKey]}`);
  }
}

// CLI equivalents for the two path headers, so they can be set without env vars.
// A flag wins over the matching env var.
for (const [flag, headerName] of Object.entries({
  '--model-path':          'D365-Custom-Model-Path',
  '--standard-model-path': 'D365-Standard-Model-Path',
})) {
  const i = args.indexOf(flag);
  const inline = args.find((a) => a.startsWith(flag + '='));
  const value = i >= 0 && args[i + 1] ? args[i + 1]
    : inline ? inline.slice(flag.length + 1)
    : null;
  if (value) {
    // Drop the env-derived duplicate so mcp-remote does not send the header twice.
    for (let j = mcpArgs.length - 2; j >= 0; j--) {
      if (mcpArgs[j] === '--header' && String(mcpArgs[j + 1]).startsWith(headerName + ':')) {
        mcpArgs.splice(j, 2);
      }
    }
    mcpArgs.push('--header', `${headerName}:${value}`);
  }
}

process.stderr.write(`[almxppmcp] Connecting to ${SERVER_URL}\n`);

// -- 5. Spawn mcp-remote ------------------------------------
const child = spawn(process.execPath, mcpArgs, {
  stdio: 'inherit',   // pass stdin/stdout/stderr straight through
env: {
    ...process.env,
    // Ensure mcp-remote does not buffer output
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});

child.on('error', (err) => {
  process.stderr.write(`[almxppmcp] Failed to start mcp-remote: ${err.message}\n`);
  if (err.code === 'ENOENT') {
    process.stderr.write(
      '[almxppmcp] Hint: try  npm install -g mcp-remote  or use npx which auto-installs it.\n'
    );
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

// Forward SIGINT / SIGTERM to child
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => child.kill(sig))
);
