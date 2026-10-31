// Builds dist/webos/, an unpackaged LG webOS app. Package it with the LG CLI: ares-package dist/webos -o dist
// The Samsung build (build-tv.mjs) is not affected by anything in here.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Releases } from '../companion/releases.mjs';

// webOS 4 runs Chromium 53; later releases only need less lowering.
export const WEBOS_TARGET = 'chrome53';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildWebOS({ outputDirectory = path.join(root, 'dist/webos') } = {}) {
  const read = name => fs.readFile(path.join(root, name));
  const packageInfo = JSON.parse(await read('package.json'));
  const context = { window: {} };
  vm.runInNewContext(await read('tv/connection.js'), context);
  const boot = context.window.APEX_CONFIG;
  if (boot.server || boot.pairingKey || !boot.publicKey?.n || boot.publicKey.d || boot.shell !== 1) throw Error('Public package must not contain personal pairing or private keys');
  // The signed update feed ships Chromium 63 code, which would replace this Chromium 53 build and break it.
  const connection = 'window.APEX_CONFIG = ' + JSON.stringify({ ...boot, onlineUpdates: false }) + ';\n';

  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const release = await new Releases(root, privateKey, { target: WEBOS_TARGET }).publish();
  const meta = JSON.parse(Buffer.from(release.manifest.payload, 'base64').toString());
  meta.version = packageInfo.version;
  const appinfo = JSON.parse(await read('webos/appinfo.json'));
  appinfo.version = packageInfo.version;

  // Chromium 53 has neither CSS grid nor :focus-within: webos.css adds fallbacks and the sidebar rule uses a .fw class.
  const css = Buffer.concat([
    Buffer.from(release.files.get('tv.css').toString('utf8').replace(/\.tv-sidebar:focus-within/g, '.tv-sidebar.fw')),
    Buffer.from('\n'), await read('webos/webos.css')
  ]);

  await fs.rm(outputDirectory, { recursive: true, force: true });
  await fs.mkdir(path.join(outputDirectory, 'menu'), { recursive: true });
  const put = (name, bytes) => fs.writeFile(path.join(outputDirectory, name), bytes);
  for (const name of ['boot.js', 'boot.css', 'menu-cache.js', 'legacy-polyfills.js']) await put(name, await read('tv/' + name));
  for (const name of ['index.html', 'icon.png', 'largeIcon.png', 'relay.js', 'relay-shim.js', 'relay-boot.sh', 'webos-polyfills.js']) await put(name, await read('webos/' + name));
  await put('appinfo.json', JSON.stringify(appinfo, null, 2) + '\n');
  await put('connection.js', connection);
  await put('bundled-version.js', 'window.APEX_BUNDLED = ' + JSON.stringify(meta) + ';\n');
  await put('menu/tv-app.js', release.files.get('tv-app.js'));
  await put('menu/tv.css', css);
  for (const name of ['dash-LICENSE.md', 'dash.all.min.js.LICENSE.txt', 'qrcode-LICENSE']) await put('menu/' + name, await read('web/vendor/' + name));
  await put('LICENSE', await read('LICENSE'));
  await put('THIRD_PARTY_NOTICES.md', await read('THIRD_PARTY_NOTICES.md'));
  return { directory: outputDirectory, revision: meta.revision, version: packageInfo.version };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildWebOS()));
