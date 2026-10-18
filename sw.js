const CACHE_NAME = "ypg-ministry-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/about.html",
  "/leadership.html",
  "/departments.html",
  "/programmes.html",
  "/newsroom.html",
  "/publications.html",
  "/contact.html",
  "/style.css",
  "/site.js",
  "/image-14.jpg",
  "/app-icon.svg",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline.html")) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

// Push delivery requires a push subscription and a trusted server-side sender.
self.addEventListener("push", (event) => {
  let data = { title: "YPG Ministry", body: "There is a new ministry update.", url: "/newsroom.html" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "YPG Ministry", {
      body: data.body || "There is a new ministry update.",
      icon: "/app-icon.svg",
      badge: "/app-icon.svg",
      data: { url: data.url || "/newsroom.html" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/newsroom.html", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      if (existing && "focus" in existing) return existing.focus();
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
