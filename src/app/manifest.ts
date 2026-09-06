import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bookface',
    short_name: 'Bookface',
    description: 'Founder portal for the Winter 2026 batch.',
    // No browser chrome once installed: it should feel like the batch's app,
    // not a bookmark.
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    background_color: '#f6f6ef',
    theme_color: '#ff6600',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
