/* Minimal MaintainOS service worker — app shell offline fallback */
const CACHE = 'maintainos-shell-v3'
const SHELL = ['/ops/tickets', '/tech', '/offline.html', '/manifest.webmanifest', '/manifest-tech.webmanifest', '/icons/icon-192.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Network-first for app pages; cache fallback to offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/offline.html')),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match('/offline.html'))),
  )
})
