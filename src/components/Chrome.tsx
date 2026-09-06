import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import SignOut from './SignOut'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/updates', label: 'Weekly update' },
  { href: '/batch', label: 'Batch' },
  { href: '/directory', label: 'Companies' },
  { href: '/people', label: 'People' },
]

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default async function Chrome({ current }: { current: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, title, company_id')
    .eq('id', user.id)
    .single()

  const profile = data as Profile | null

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
            </Link>
          ))}
        </nav>
        <div className="me">
          <span className="av">{initials(profile?.full_name ?? '?')}</span>
          <span>{profile?.full_name}</span>
          {profile?.role === 'partner' && <span className="rolepill">Partner</span>}
          <SignOut />
        </div>
      </div>
    </header>
  )
}
