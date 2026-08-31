/* Minimal MaintainOS service worker — app shell offline fallback */
const CACHE = 'maintainos-shell-v5'
const SHELL = [
  '/ops/tickets',
  '/tech',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest-tech.webmanifest',
  '/brand/oc-mark.png',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy))
      return res
    })
    .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline.html')))
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Network-first for navigations + Next/CSS/JS/manifests so design deploys
  // are not stuck behind stale PWA cache-first hits.
  const path = url.pathname
  const isAppAsset =
    path.startsWith('/_next/') ||
    path.endsWith('.css') ||
    path.endsWith('.js') ||
    path.endsWith('.webmanifest') ||
    path === '/sw.js'

  if (req.mode === 'navigate' || isAppAsset) {
    event.respondWith(networkFirst(req))
    return
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match('/offline.html'))),
  )
})
