// Protocol behaviour is asserted against a local stub, so the results do not depend on network
// conditions or on holding a valid API token. One live check at the end covers the real server.
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const BRIDGE = path.join(__dirname, '..', 'bin', 'almxppmcp.js');
let fail = 0;
const seen = [];

function ok(cond, label, detail) {
  console.log('  ' + (cond ? 'OK   ' : 'ECHEC') + ' ' + label + (detail ? '  -- ' + detail : ''));
  if (!cond) fail++;
}

// The stub answers each method the way the real server was measured to answer it.
function startStub() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        let msg = {};
        try { msg = JSON.parse(body); } catch (e) { /* deliberate: exercised below */ }
        seen.push({ headers: req.headers, msg });

        if (msg.id === undefined || msg.id === null) { res.writeHead(202).end(); return; }

        if (msg.method === 'plain-json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { via: 'json' } }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Set-Cookie': 'acaAffinity=replica-7; Path=/; HttpOnly',
        });

        if (msg.method === 'split') {
          // Cut the frame mid-line to prove the reader buffers across TCP chunks.
          const payload = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { via: 'split' } });
          const frame = ': keep-alive\nevent: message\ndata: ' + payload + '\n\n';
          const cut = Math.floor(frame.length / 2);
          res.write(frame.slice(0, cut));
          setTimeout(() => res.end(frame.slice(cut)), 120);
          return;
        }

        if (msg.method === 'multiline') {
          res.end('event: message\ndata: {"jsonrpc":"2.0","id":' + msg.id + ',\ndata: "result":{"via":"multiline"}}\n\n');
          return;
        }

        res.end('event: message\ndata: ' + JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { via: 'sse' } }) + '\n\n');
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function drive(url, messages, extraEnv, extraArgs, waitForReply) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [BRIDGE, '--api-key', 'TEST_TOKEN'].concat(extraArgs || []), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, { ALMXPPMCP_SERVER_URL: url }, extraEnv || {}),
    });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    let i = 0;
    const next = () => {
      if (i >= messages.length) { setTimeout(() => { p.stdin.end(); p.kill(); resolve({ out, err }); }, 900); return; }
      const m = messages[i++];
      // A raw string is written verbatim, so a genuinely unparsable line can be exercised.
      const before = out.length;
      p.stdin.write((typeof m === 'string' ? m : JSON.stringify(m)) + '\n');
      if (!waitForReply) { setTimeout(next, 260); return; }
      // Cookie propagation depends on the previous reply having landed, not on a delay.
      const started = Date.now();
      const poll = () => {
        if (out.length > before || Date.now() - started > 4000) { next(); return; }
        setTimeout(poll, 30);
      };
      poll();
    };
    next();
  });
}

function lines(out) { return out.split('\n').filter((l) => l.trim()); }

(async () => {
  const srv = await startStub();
  const url = 'http://127.0.0.1:' + srv.address().port + '/mcp';

  console.log('=== 1. cadrage des reponses ===');
  let r = await drive(url, [
    { jsonrpc: '2.0', id: 1, method: 'normal' },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'split' },
    { jsonrpc: '2.0', id: 3, method: 'multiline' },
    { jsonrpc: '2.0', id: 4, method: 'plain-json' },
  ]);
  const got = lines(r.out).map((l) => { try { return JSON.parse(l); } catch (e) { return { bad: l }; } });

  ok(got.length === 4, 'la notification n ecrit rien, les 4 requetes repondent', got.length + ' ligne(s)');
  ok(got.every((g) => !g.bad), 'chaque ligne est un JSON complet');
  ok(got.some((g) => g.id === 1 && g.result && g.result.via === 'sse'), 'SSE simple decode');
  ok(got.some((g) => g.id === 2 && g.result && g.result.via === 'split'), 'trame coupee en deux morceaux TCP reassemblee');
  ok(got.some((g) => g.id === 3 && g.result && g.result.via === 'multiline'), 'data: sur plusieurs lignes recolle');
  ok(got.some((g) => g.id === 4 && g.result && g.result.via === 'json'), 'reponse application/json relayee');
  ok(!/event:|keep-alive/.test(r.out), 'aucun residu de protocole SSE sur stdout');

  console.log('\n=== 2. en-tetes envoyes ===');
  seen.length = 0;
  await drive(url,
    [{ jsonrpc: '2.0', id: 1, method: 'normal' }, { jsonrpc: '2.0', id: 2, method: 'normal' }],
    { DEVOPS_ORG_URL: 'https://dev.azure.com/Contoso' },
    ['--model-path', 'C:\\MyProject\\Metadata'],
    true);

  const first = seen[0] ? seen[0].headers : {};
  const second = seen[1] ? seen[1].headers : {};
  ok(first['x-api-key'] === 'TEST_TOKEN', 'X-API-Key transmis');
  ok(first['d365-custom-model-path'] === 'C:\\MyProject\\Metadata', 'chemin du modele passe en en-tete', first['d365-custom-model-path']);
  ok(first['devops_org_url'] === 'https://dev.azure.com/Contoso', 'variable d environnement transmise');
  ok(String(first['accept'] || '').indexOf('text/event-stream') >= 0, 'Accept annonce le SSE');
  ok(!first.cookie, 'aucun cookie sur la premiere requete');
  ok(String(second.cookie || '').indexOf('acaAffinity=replica-7') >= 0,
     'affinite de replica renvoyee sur la suivante', second.cookie || 'aucun');

  console.log('\n=== 3. robustesse ===');
  r = await drive(url, ['ceci n est pas du json']);
  ok(r.out.trim() === '', 'une ligne illisible ne pollue pas stdout');
  ok(/Ignoring unparsable/.test(r.err), 'elle est signalee sur stderr');

  r = await drive('http://127.0.0.1:9/mcp', [{ jsonrpc: '2.0', id: 42, method: 'normal' }]);
  let e = null;
  try { e = JSON.parse(lines(r.out)[0]); } catch (x) { /* asserted below */ }
  ok(e && e.id === 42 && e.error, 'serveur injoignable : le client recoit une erreur, pas un silence',
     e && e.error ? e.error.message.slice(0, 46) : 'rien');

  srv.close();

  console.log('\n=== 4. serveur reel (bout en bout) ===');
  r = await new Promise((resolve) => {
    const p = spawn(process.execPath, [BRIDGE, '--api-key', 'invalid-on-purpose'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list' }) + '\n');
    setTimeout(() => { p.stdin.end(); p.kill(); resolve({ out, err }); }, 9000);
  });
  let live = null;
  try { live = JSON.parse(lines(r.out)[0]); } catch (x) { /* asserted below */ }
  ok(live && live.id === 7, 'api.almxpp.com repond, reponse correlee', live ? 'id=' + live.id : 'aucune reponse');
  ok(live && live.error && /Invalid API token/.test(live.error.message),
     'le refus du serveur est relaye tel quel', live && live.error ? 'code ' + live.error.code : '');

  console.log('');
  console.log(fail ? '  ' + fail + ' echec(s)' : '  TOUT CONFORME');
  process.exit(fail ? 1 : 0);
})();
