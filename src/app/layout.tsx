import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bookface',
  description: 'Founder portal for the Winter 2026 batch.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="topline" />
        {children}
      </body>
    </html>
  )
}
