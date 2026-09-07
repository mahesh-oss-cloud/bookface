import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import SignOut from './SignOut'
import MobileNav from './MobileNav'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/company', label: 'Company' },
  { href: '/forum', label: 'Forum' },
  { href: '/updates', label: 'Weekly update' },
  { href: '/runway', label: 'Runway' },
  { href: '/batch', label: 'Batch' },
  { href: '/directory', label: 'Companies' },
  { href: '/people', label: 'People' },
  { href: '/resources', label: 'Resources' },
  { href: '/messages', label: 'Messages' },
]

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default async function Chrome({ current }: { current: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [meRes, unreadRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, bookface_id, role, title, company_id, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null),
  ])

  const profile = meRes.data as Profile | null
  const unread = unreadRes.count ?? 0

  // The partner has no weekly update to file — reporting belongs to founders —
  // so that item simply isn't in their nav.
  const items = profile?.role === 'partner'
    ? NAV.filter(n => n.href !== '/updates')
    : NAV

  return (
    <header className="bar">
      <div className="bar-in">
        <div className="mark">Y</div>
        <div className="wordmark">Bookface</div>
        <nav className="nav">
          {items.map(item => (
            <Link key={item.href} href={item.href} className={item.href === current ? 'on' : ''}>
              {item.label}
              {item.href === '/messages' && unread > 0 && <span className="unread">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="me">
          <span className="av">{initials(profile?.full_name ?? '?')}</span>
          <span className="me-name">{profile?.full_name}</span>
          {profile?.role === 'partner' && <span className="rolepill">Partner</span>}
          <SignOut />
        </div>
      </div>

      <MobileNav
        items={items}
        current={current}
        name={profile?.full_name ?? ''}
        role={profile?.role ?? 'founder'}
        unread={unread}
      />
    </header>
  )
}
