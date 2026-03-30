/* Simple, safe PWA service worker (no API caching). */

const CACHE_NAME = 'f1base-cache-v1'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function shouldHandleRequest(requestUrl) {
  if (requestUrl.origin !== self.location.origin) return false
  if (requestUrl.pathname.startsWith('/api/')) return false
  return true
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (!shouldHandleRequest(requestUrl)) return

  // SPA navigations: network-first, fallback to cached shell, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (await cache.match('/index.html')) || (await cache.match('/offline.html'))
        })
    )
    return
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Only cache successful same-origin responses
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || fetchPromise
    })
  )
})

