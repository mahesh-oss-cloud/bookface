/**
 * Bookface IDs.
 *
 * Nobody logs in with a personal email address. The batch issues you an ID when
 * you are accepted, and that ID is your identity here — it is what you type to
 * sign in and how batchmates address you.
 *
 * Supabase auth is an email/password provider underneath, so the ID is expanded
 * to a routable-looking address before it reaches the auth API. That domain is
 * an implementation detail and is never shown: `.test` is reserved by RFC 2606
 * precisely so it can never collide with a real domain, and no mail is ever sent
 * to it.
 */

/** The batch that issues these IDs. Bumping this issues a new namespace. */
export const BATCH_TAG = 'w26'

const AUTH_DOMAIN = `${BATCH_TAG}.bookface.test`

/** Valid IDs are lowercase letters and digits — no dots, no @, nothing to typo. */
export const ID_PATTERN = '[a-z0-9]{3,32}'

export function normalizeId(input: string): string {
  // People paste their full issued address out of habit. Take the handle from it
  // rather than making them retype, and fold case so `Saharshkeerthi` works.
  return input.trim().toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '')
}

/** The address handed to Supabase auth. Never rendered. */
export function authAddress(bookfaceId: string): string {
  return `${normalizeId(bookfaceId)}@${AUTH_DOMAIN}`
}

/** How an ID is written when shown to a person: saharshkeerthi@w26 */
export function displayId(bookfaceId: string | null): string {
  return bookfaceId ? `${bookfaceId}@${BATCH_TAG}` : '—'
}
