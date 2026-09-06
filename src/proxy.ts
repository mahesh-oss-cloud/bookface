import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // sw.js and manifest.webmanifest must be excluded, not merely public.
  // Registration refuses a service worker script that arrives via a redirect,
  // and this proxy redirects every unauthenticated request to /login — so the
  // worker silently never registered and the app was not installable on
  // Android. The failure is invisible without a browser console.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
