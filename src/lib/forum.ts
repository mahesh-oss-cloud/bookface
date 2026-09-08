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

// Word-based matching is now shared with the people directory, so it lives on
// its own. Re-exported here for the forum pages that already import it.
export { safeLike, searchTerms } from './search'
