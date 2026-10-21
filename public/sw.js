// Farrell Electric portal service worker — install shell only.
// Passthrough: no caching, so signed-in portal data is never served stale.
// A fetch handler is registered because some browsers require one for installability.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: the browser handles the request normally.
});

// ---- PUSH NOTIFICATIONS GO HERE (later) ----
// self.addEventListener("push", (event) => { ... });
// self.addEventListener("notificationclick", (event) => { ... });
