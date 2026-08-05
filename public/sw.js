const CACHE_PREFIX = 'fm1-editor-shell-'
const CACHE_NAME = `${CACHE_PREFIX}__FM1_CACHE_VERSION__`
const PRECACHE_URLS = __FM1_PRECACHE_MANIFEST__
const scopeUrl = new URL(self.registration.scope)
const indexUrl = new URL('./index.html', scopeUrl).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )),
      self.clients.claim(),
    ]),
  )
})

function isCacheableStaticRequest(request) {
  return ['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(indexUrl, response.clone())
    return response
  } catch {
    return (await cache.match(request))
      ?? (await cache.match(indexUrl))
      ?? Response.error()
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== scopeUrl.origin || !url.href.startsWith(scopeUrl.href)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isCacheableStaticRequest(request)) {
    event.respondWith(cacheFirstStatic(request))
  }
})
