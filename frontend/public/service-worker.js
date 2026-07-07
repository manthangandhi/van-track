/// Service Worker for VanTrack
// Handles offline support, caching, and sync

const CACHE_NAME = 'vantrack-v2'
const ASSETS_TO_CACHE = ['./offline.html', './icons/icon-192.png', './icons/icon-512.png']

// Install event: cache offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // API calls: network-first, cache as fallback
  if (url.pathname.includes('/api/') || url.origin === 'https://[your-supabase-url]') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request).then((response) => {
            return response || new Response('Offline - please try again when online', { status: 503 })
          })
        })
    )
  } else {
    // Static assets: cache-first
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }
        return fetch(request)
          .then((response) => {
            // Don't cache non-200 responses
            if (!response || response.status !== 200) {
              return response
            }
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
            return response
          })
          .catch(() => {
            // Return offline page if available
            return caches.match(OFFLINE_URL)
          })
      })
    )
  }
})

// Background sync for punch queue (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-punches') {
    event.waitUntil(syncPunches())
  }
})

async function syncPunches() {
  // This will be called when device comes online
  // Trigger sync from main app via postMessage
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'BACKGROUND_SYNC' })
  })
}
