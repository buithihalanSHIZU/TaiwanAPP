const CACHE_NAME = "tu-dai-loan-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./aaa.css",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/bootstrap.js",
  "./js/core/data.js",
  "./js/core/session.js",
  "./js/core/state.js",
  "./js/features/auth.js",
  "./js/features/flashcards.js",
  "./js/features/global.js",
  "./js/features/groups.js",
  "./js/features/vocabulary.js",
  "./js/ui/render.js",
  "./views/auth.html",
  "./views/group-dialog.html",
  "./views/study-dialog.html",
  "./views/word-dialog.html",
  "./views/workspace.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    })
  );
});
