// Loopback relay for webOS: F1 answers with Cross-Origin-Resource-Policy: same-origin, which webOS's file:// pages
// cannot satisfy. Forwards *.formula1.com requests, drops cross-origin-* headers and keeps F1 cookies on the TV side.
// Runs on the TV's node 12 (no ?. / ??). Usage: node relay.js  (listens on 127.0.0.1:8899)
'use strict';
const http = require('http'), https = require('https');
const PORT = 8899, jar = [];

const allowed = host => host === 'formula1.com' || host.endsWith('.formula1.com');

function storeCookies(host, lines) {
  (lines || []).forEach(line => {
    const parts = line.split(';'), pair = parts.shift(), i = pair.indexOf('=');
    if (i < 1) return;
    const c = { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim(), domain: host, path: '/', exp: 0 };
    parts.forEach(p => {
      const j = p.indexOf('='), k = (j < 0 ? p : p.slice(0, j)).trim().toLowerCase(), v = j < 0 ? '' : p.slice(j + 1).trim();
      if (k === 'domain') c.domain = v.replace(/^\./, '').toLowerCase();
      else if (k === 'path') c.path = v || '/';
      else if (k === 'max-age') c.exp = Date.now() + Number(v) * 1000;
      else if (k === 'expires' && !c.exp) c.exp = Date.parse(v) || 0;
    });
    if (!allowed(c.domain)) return;
    for (let n = jar.length - 1; n >= 0; n--) if (jar[n].name === c.name && jar[n].domain === c.domain && jar[n].path === c.path) jar.splice(n, 1);
    if (!c.exp || c.exp > Date.now()) jar.push(c);
  });
}
function cookieFor(host, path) {
  const now = Date.now();
  return jar.filter(c => (!c.exp || c.exp > now) && (host === c.domain || host.endsWith('.' + c.domain)) && path.indexOf(c.path) === 0)
    .map(c => c.name + '=' + c.value).join('; ');
}

http.createServer((req, res) => {
  const origin = req.headers.origin || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '600',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Location, X-Relay-Location'
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let target;
  try { target = new URL(decodeURIComponent(req.url.slice(1))); } catch (_) { res.writeHead(400, cors); res.end('bad url'); return; }
  if (target.protocol !== 'https:' || !allowed(target.hostname)) { res.writeHead(403, cors); res.end('host not allowed'); return; }
  const headers = {};
  Object.keys(req.headers).forEach(k => { if (!/^(host|origin|referer|cookie|connection|content-length|sec-fetch-.*)$/i.test(k)) headers[k] = req.headers[k]; });
  const cookie = cookieFor(target.hostname, target.pathname);
  if (cookie) headers.cookie = cookie;
  headers.origin = 'https://f1tv.formula1.com'; headers.referer = 'https://f1tv.formula1.com/';
  const up = https.request({ hostname: target.hostname, path: target.pathname + target.search, method: req.method, headers }, r => {
    storeCookies(target.hostname, r.headers['set-cookie']);
    const out = {};
    Object.keys(r.headers).forEach(k => { if (!/^(set-cookie|cross-origin-.*|content-security-policy.*|strict-transport-security|access-control-.*)$/i.test(k)) out[k] = r.headers[k]; });
    if (r.headers.location) {
      try { const l = new URL(r.headers.location, target); out.location = allowed(l.hostname) ? 'http://127.0.0.1:' + PORT + '/' + l.href : l.href; } catch (_) {}
    }
    res.writeHead(r.statusCode, Object.assign(out, cors)); r.pipe(res);
  });
  up.on('error', e => { if (!res.headersSent) res.writeHead(502, cors); res.end('upstream: ' + e.code); });
  req.pipe(up);
}).listen(PORT, '127.0.0.1');
