var CACHE = "kobetsu-plan-cache-v11";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // アプリ本体(index.html等)は常にネットワーク優先。失敗時のみキャッシュ。
  if (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/") || url.pathname === "" || ASSETS.indexOf(url.pathname) !== -1 || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".json") || url.pathname.endsWith(".css") || url.pathname.endsWith(".png")) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok && url.pathname.indexOf("manifest") === -1) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || fetch(e.request); });
      })
    );
    return;
  }
  // その他はキャッシュ優先（既存動作維持）
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var fetchP = fetch(e.request).then(function (res) {
        if (res && res.ok) { caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || fetchP;
    })
  );
});
