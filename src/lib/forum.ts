/**
 * A fixed topic list rather than free tags. Free text drifts — "fundraise",
 * "Fundraising", "fund raising" become three different things and the archive
 * stops being navigable, which defeats the point of keeping one.
 */
export const TOPICS = [
  'Fundraising',
  'Technical',
  'Product',
  'Legal',
  'Marketing & Sales',
  'Founder Life',
] as const

export type Topic = (typeof TOPICS)[number]

export const SORTS = {
  new: 'Newest',
  top: 'Most upvoted',
  active: 'Most answers',
} as const

export type Sort = keyof typeof SORTS

export function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** PostgREST treats commas and parens as syntax inside a filter. */
export function safeLike(v: string): string {
  return v.replace(/[,()*\\]/g, ' ').trim()
}

/**
 * Search on words rather than one contiguous string. "pricing per seat" should
 * find a thread titled "per-seat…" that was tagged pricing; matching the phrase
 * literally finds nothing, which is the difference between an archive that
 * answers you and one that looks empty.
 *
 * Each term becomes its own ilike, and PostgREST ANDs them, so every word has
 * to appear somewhere in the question or its replies.
 */
export function searchTerms(q: string): string[] {
  return Array.from(new Set(
    safeLike(q).toLowerCase().split(/[\s/|:;'"?!.]+/).filter(w => w.length >= 2)
  )).slice(0, 6)
}
