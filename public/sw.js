/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'f1base-static-v1'
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/f1.svg', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
      await self.clients.claim()
    })(),
  )
})

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache API proxy requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // App-shell for SPA navigation
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        try {
          const res = await fetch(request)
          if (res && res.ok) cache.put('/index.html', res.clone())
          return res
        } catch {
          return (await cache.match('/index.html')) || (await cache.match('/'))
        }
      })(),
    )
    return
  }

  // Cache-first for static assets; SWR for everything else.
  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$/.test(url.pathname)
  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(request)
        if (cached) return cached
        const res = await fetch(request)
        if (res && res.ok) cache.put(request, res.clone())
        return res
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => null)
      return cached || (await fetchPromise) || new Response('', { status: 504 })
    })(),
  )
})

