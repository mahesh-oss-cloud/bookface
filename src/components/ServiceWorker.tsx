'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker. Without one, Chrome on Android offers a
 * shortcut rather than a real install, and the app opens inside a browser tab.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Registration failing is not worth surfacing: the app works without it,
    // it just is not installable.
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
