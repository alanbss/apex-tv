import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { buildWebOS } from '../tools/build-webos.mjs';
const out = await fs.mkdtemp(path.join(os.tmpdir(), 'apex-webos-'));
await buildWebOS({ outputDirectory: out });
const read = name => fs.readFile(path.join(out, name), 'utf8');
test('webOS package has an app manifest and no Samsung-only pieces', async () => {
  const info = JSON.parse(await read('appinfo.json')), html = await read('index.html');
  assert.equal(info.type, 'web'); assert.equal(info.main, 'index.html'); assert.match(info.id, /^[a-z0-9.-]+$/);
  assert.doesNotMatch(html, /webapis|avplayer/);
  assert.ok(html.indexOf('relay-shim.js') < html.indexOf('boot.js') && html.indexOf('webos-polyfills.js') < html.indexOf('legacy-polyfills.js'));
});
test('webOS bundle parses as Chromium 53 and disables the Chromium 63 update feed', async () => {
  for (const name of ['boot.js', 'menu-cache.js', 'connection.js', 'legacy-polyfills.js', 'webos-polyfills.js', 'relay-shim.js', 'menu/tv-app.js']) acorn.parse(await read(name), { ecmaVersion: 2016 });
  const context = { window: {} }; vm.runInNewContext(await read('connection.js'), context);
  assert.equal(context.window.APEX_CONFIG.onlineUpdates, false); assert.equal(context.window.APEX_CONFIG.server, '');
  assert.match(await read('menu/tv.css'), /\.tv-sidebar\.fw/); assert.doesNotMatch(await read('menu/tv.css'), /:focus-within/);
});
test('relay only forwards formula1.com over https and never exposes the pairing key or private material', async () => {
  const relay = await read('relay.js'); assert.match(relay, /endsWith\('\.formula1\.com'\)/); assert.match(relay, /protocol !== 'https:'/);
  assert.doesNotMatch(relay + await read('relay-shim.js'), /pairingKey|PRIVATE KEY/);
});
