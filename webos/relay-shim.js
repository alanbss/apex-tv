// Sends F1 requests through relay.js (see there). Loaded first in index.html; a no-op for other hosts.
(function () {
  var P = 'http://127.0.0.1:8899/', F1 = /^https:\/\/(?:[a-z0-9-]+\.)*formula1\.com\//i;
  function wrap(u) { return F1.test(u) ? P + u : u; }
  function unwrap(u) { return typeof u === 'string' && u.indexOf(P) === 0 ? u.slice(P.length) : u; }
  var nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string') input = wrap(input);
    else if (input && input.url && F1.test(input.url)) input = new Request(wrap(input.url), input);
    return nativeFetch.call(this, input, init);
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) { arguments[1] = wrap(String(url)); return open.apply(this, arguments); };
  [[Response.prototype, 'url'], [XMLHttpRequest.prototype, 'responseURL']].forEach(function (p) {
    var d = Object.getOwnPropertyDescriptor(p[0], p[1]);
    if (d && d.get) Object.defineProperty(p[0], p[1], { get: function () { return unwrap(d.get.call(this)); }, configurable: true });
  });
}());
