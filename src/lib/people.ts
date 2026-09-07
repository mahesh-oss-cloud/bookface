import type { Profile } from './types'

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

/** Names arrive from a CSV typed by a human, so match on letters only. */
function key(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * A founder listed in the directory is only messageable if that same person
 * holds an account here. Everyone else is a name on a company record, and the
 * interface says so rather than offering a Send that goes nowhere.
 */
export function matchAccount(name: string, people: Profile[]): Profile | undefined {
  const k = key(name)
  return people.find(p => key(p.full_name) === k)
}

export function shortWhen(iso: string): string {
  const then = new Date(iso)
  const mins = Math.round((Date.now() - then.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`
  if (mins < 60 * 24 * 7) return `${Math.round(mins / 1440)}d`
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function fullWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
