/*
 * Bookface service worker.
 *
 * The only reason this exists is installability and a fast, non-blank launch.
 * It is deliberately conservative about what it stores, because this app's
 * whole security model is that a founder sees only their own company's rows:
 *
 *   - Navigations and any Supabase request are NEVER cached. A cached HTML page
 *     is somebody's authenticated view; serving it later — to a different
 *     account on a shared phone, or after RLS would have refused it — would
 *     leak exactly what row-level security exists to prevent.
 *   - Only build output and icons are cached. Those are immutable, public, and
 *     identical for every user, so there is nothing in them to leak.
 *
 * The offline fallback is a static page that asks you to reconnect; it never
 * pretends to show data.
 */

const VERSION = 'bookface-v1'
const OFFLINE_URL = '/offline'

// Same-origin paths that are safe to keep: content-hashed build output and the
// app's own icons. Nothing here varies by who is signed in.
function isCacheableAsset(url) {
  return url.pathname.startsWith('/_next/static/')
    || url.pathname === '/manifest.webmanifest'
    || /^\/(icon-|apple-touch-icon|blackbird-finance)/.test(url.pathname)
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Anything not served by this app — Supabase above all — goes straight to the
  // network and is never stored.
  if (url.origin !== self.location.origin) return

  // A page request is an authenticated view. Always fetch it; if the network is
  // gone, show the offline page rather than a stale copy of someone's data.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(r => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  if (!isCacheableAsset(url)) return

  // Build output is content-hashed, so a cache hit is always correct and there
  // is no revalidation to do.
  event.respondWith(
    caches.match(request).then(hit => hit ?? fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(VERSION).then(cache => cache.put(request, copy))
      }
      return response
    }))
  )
})
