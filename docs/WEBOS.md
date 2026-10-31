# LG webOS

[← Back to Apex TV](../README.md)

Experimental. The webOS build runs the same menu and the same browser player
(dash.js with MSE and Widevine EME) as the Samsung build. Samsung AVPlay is not
used.

**Tested:** one LG TV running Chromium 87 (webOS 6), rooted with Homebrew
Channel. Sign-in and playback worked. Live DRM key rotation and long sessions are
untested. **Untested:** webOS 4 and 5. The bundle is lowered to Chromium 53 so it
should parse on webOS 4, but no webOS 4 hardware has run it.

## Build

```sh
npm ci --ignore-scripts
npm run build:webos          # writes dist/webos/
npx @webos-tools/cli ares-package dist/webos -o dist
```

The package id is `com.abs.apextv`. Install the resulting `.ipk` with
`ares-install` in Developer Mode, or with Homebrew Channel on a rooted TV.

## Why there is a relay

F1 answers with `Cross-Origin-Resource-Policy: same-origin`. webOS already waives
CORS for installed apps, but Chromium still blocks those responses
(`ERR_BLOCKED_BY_RESPONSE`), so sign-in and catalogue requests fail. Samsung's
`<access origin="*">` has no webOS counterpart.

`relay.js` is a small Node 12 server on `127.0.0.1:8899`. It forwards only
`*.formula1.com` HTTPS requests, removes the `cross-origin-*` headers, and keeps F1
cookies in memory on the TV. `relay-shim.js` sends the app's `fetch` and XHR calls
for those hosts through it. No credentials leave the TV except to F1.

Start it with the TV's own Node (needs shell access, so a rooted TV):

```sh
node /media/developer/apps/usr/palm/applications/com.abs.apextv/relay.js &
```

`relay-boot.sh` is an optional Homebrew Channel init script that starts it at boot;
copy it to `/var/lib/webosbrew/init.d/` yourself. **A stock TV in Developer Mode
cannot run the relay**, so sign-in will fail there until F1 changes the header or
the relay is packaged as a webOS JS service.

## Differences from the Samsung build

- Online menu updates are off: the signed feed ships Chromium 63 code.
- Back is key 461; exit uses `window.close()`.
- `webos/webos-polyfills.js` and `webos/webos.css` cover Chromium 53 (no CSS grid,
  no `:focus-within`, no `Object.entries`).
