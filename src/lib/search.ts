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
 * to appear somewhere in the row's search text.
 */
export function searchTerms(q: string): string[] {
  return Array.from(new Set(
    safeLike(q).toLowerCase().split(/[\s/|:;'"?!.]+/).filter(w => w.length >= 2)
  )).slice(0, 6)
}
