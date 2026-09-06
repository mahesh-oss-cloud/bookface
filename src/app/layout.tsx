import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorker from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: 'Bookface',
  description: 'Founder portal for the Winter 2026 batch.',
  applicationName: 'Bookface',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Bookface',
    // The status bar sits over the page, so the header carries its own safe-area
    // padding rather than the OS reserving space for it.
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover lets the page reach under the notch and the home
  // indicator; env(safe-area-inset-*) in the CSS puts the padding back where it
  // is actually needed, instead of leaving letterbox bars.
  viewportFit: 'cover',
  themeColor: '#ff6600',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime, not build time, so the Render build cannot fail on
            an egress-blocked font fetch. Manrope is a free stand-in for YC's
            proprietary Macan — the same clean, semi-geometric marketing look. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <div className="topline" />
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
