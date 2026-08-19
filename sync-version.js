#!/usr/bin/env node
// package.json holds the version; server.json repeats it twice for the MCP registry. Run from the
// npm "version" and "prepack" hooks so the two never drift again.
//
// The rewrite is textual on purpose: re-serialising the JSON reflows unrelated formatting and
// buries the one line that matters in a noisy diff.
'use strict';

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
const serverPath = path.join(dir, 'server.json');
const before = fs.readFileSync(serverPath, 'utf8');

const VERSION_FIELD = /("version"\s*:\s*")([^"]+)(")/g;
const found = before.match(VERSION_FIELD) || [];

// server.json carries the version at the root and once in the package entry. Any other count means
// the file grew a shape this script was never taught, and guessing would be worse than stopping.
if (found.length !== 2) {
  console.error(`[sync-version] expected 2 version fields in server.json, found ${found.length} -- leaving it alone`);
  process.exit(1);
}

const after = before.replace(VERSION_FIELD, `$1${pkg.version}$3`);

let parsed;
try {
  parsed = JSON.parse(after);
} catch (err) {
  console.error(`[sync-version] the rewrite would produce invalid JSON: ${err.message}`);
  process.exit(1);
}
if (parsed.version !== pkg.version || (parsed.packages || []).some((p) => p.version !== pkg.version)) {
  console.error('[sync-version] versions still disagree after the rewrite -- not writing');
  process.exit(1);
}

if (after === before) {
  console.log(`[sync-version] server.json already at ${pkg.version}`);
  process.exit(0);
}

fs.writeFileSync(serverPath, after);
console.log(`[sync-version] server.json -> ${pkg.version}`);
