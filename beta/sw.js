// Offline shell. Bump VERSION on every beta change so the phone takes the new files.
const VERSION = "pp-beta-6";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png",
  "css/tokens.css", "css/app.css",
  "js/app.js", "js/nav.js", "js/ui.js", "js/icons.js", "js/store.js", "js/contract.js", "js/actions.js", "js/samples.js", "js/zip.js", "js/sync.js", "js/registry_seed.js",
  "js/screens/home.js", "js/screens/feed.js", "js/screens/capture.js", "js/screens/entry.js", "js/screens/inbox.js",
  "js/screens/timeline.js", "js/screens/calendar.js", "js/screens/search.js", "js/screens/settings.js"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first: a fresh beta when online, the cached one offline.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(VERSION).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
