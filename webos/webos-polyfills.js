/* webOS 4 (Chromium 53): APIs added in Chromium 54-62, plus a :focus-within stand-in (see build-webos.mjs).
   Loaded before legacy-polyfills.js. Keep this file ES5. */
(function (global) {
  'use strict';
  function define(target, name, value) { if (target && !(name in target)) Object.defineProperty(target, name, { value: value, writable: true, configurable: true, enumerable: false }); }
  define(Object, 'values', function (o) { return Object.keys(o).map(function (k) { return o[k]; }); });
  define(Object, 'entries', function (o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); });
  define(Object, 'getOwnPropertyDescriptors', function (o) { var r = {}; Reflect.ownKeys(o).forEach(function (k) { r[k] = Object.getOwnPropertyDescriptor(o, k); }); return r; });
  function pad(s, n, f, left) { s = String(s); n = n >> 0; f = f === undefined ? ' ' : String(f); if (s.length >= n || !f) return s; var p = ''; while (p.length < n - s.length) p += f; p = p.slice(0, n - s.length); return left ? p + s : s + p; }
  define(String.prototype, 'padStart', function (n, f) { return pad(this, n, f, true); });
  define(String.prototype, 'padEnd', function (n, f) { return pad(this, n, f, false); });
  if (typeof Symbol === 'function' && !Symbol.asyncIterator) Object.defineProperty(Symbol, 'asyncIterator', { value: Symbol('Symbol.asyncIterator') });
  /* :focus-within (Chromium 60) is rewritten to .fw at build time; mirror it here. */
  function sync(e) { var n = document.querySelectorAll('.tv-sidebar'), i, has; for (i = 0; i < n.length; i++) { has = e.type === 'focus' && n[i].contains(e.target); if (has !== n[i].classList.contains('fw')) n[i].classList.toggle('fw', has); } }
  if (typeof document !== 'undefined') { document.addEventListener('focus', sync, true); document.addEventListener('blur', sync, true); }
}(typeof window !== 'undefined' ? window : globalThis));
