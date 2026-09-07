'use client'

import Link from 'next/link'
import { useState } from 'react'
import SignOut from './SignOut'

export interface NavItem { href: string; label: string }

/**
 * On a phone the nav lives at the bottom, where a thumb reaches. Four
 * destinations get a permanent tab; the rest live behind More rather than
 * being crammed into a row nobody can hit accurately.
 *
 * Which four is not arbitrary — they are the things a founder opens during the
 * batch. Reference material (People, Companies) is reached deliberately, not
 * by accident.
 */
export default function MobileNav({
  items, current, name, role, unread = 0,
}: {
  items: NavItem[]
  current: string
  name: string
  role: 'founder' | 'partner'
  unread?: number
}) {
  const [open, setOpen] = useState(false)

  const primaryHrefs = role === 'partner'
    ? ['/', '/company', '/forum', '/batch']
    : ['/', '/company', '/forum', '/updates']

  // A tab label has to fit one line at 390px. "Weekly update" wraps and makes
  // that tab taller than its neighbours, so tabs get a short form; the sheet and
  // the desktop nav keep the full name.
  const SHORT: Record<string, string> = { '/updates': 'Update', '/directory': 'Companies' }

  const primary = primaryHrefs
    .map(h => items.find(i => i.href === h))
    .filter((i): i is NavItem => Boolean(i))
    .map(i => ({ ...i, label: SHORT[i.href] ?? i.label }))
  const rest = items.filter(i => !primaryHrefs.includes(i.href))

  return (
    <>
      {open && (
        <div className="sheet-scrim" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="More">
            <div className="sheet-hd">
              <span>{name}</span>
              <button className="btn btn-sm" onClick={() => setOpen(false)}>Close</button>
            </div>
            {rest.map(i => (
              <Link key={i.href} href={i.href} className="sheet-link" onClick={() => setOpen(false)}>
                {i.label}
                {i.href === '/messages' && unread > 0 && <span className="unread">{unread}</span>}
              </Link>
            ))}
            <div className="sheet-foot"><SignOut /></div>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label="Primary">
        {primary.map(i => (
          <Link key={i.href} href={i.href} className={i.href === current ? 'on' : ''}>
            {i.label}
          </Link>
        ))}
        <button
          className={rest.some(i => i.href === current) ? 'on' : ''}
          onClick={() => setOpen(true)}
          aria-expanded={open}
        >
          More
          {/* Messages sits behind More, so an unread one has to be visible from
              whichever tab you happen to be on. */}
          {unread > 0 && <span className="unread">{unread}</span>}
        </button>
      </nav>
    </>
  )
}
