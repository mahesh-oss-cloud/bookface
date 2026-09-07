import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import MessageLink from '@/components/MessageLink'
import type { Profile, Company } from '@/lib/types'
import { displayId } from '@/lib/identity'
import { initials } from '@/lib/people'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [peopleRes, coRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id').order('role').order('full_name'),
    supabase.from('companies').select('*'),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const companies = (coRes.data ?? []) as Company[]
  const partners = people.filter(p => p.role === 'partner')
  const founders = people.filter(p => p.role === 'founder')

  function card(p: Profile) {
    const company = companies.find(c => c.id === p.company_id)
    return (
      <div className="row" key={p.id}>
        <span className="av" style={{ width: 32, height: 32, fontSize: 11 }}>{initials(p.full_name)}</span>
        <span className="what" style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>
            {p.full_name}
            {p.id === user!.id && <span className="tag" style={{ marginLeft: 6 }}>you</span>}
          </div>
          <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 1 }}>
            {p.title}
            {company && <> &middot; {company.name} <span className="batchtag">W26</span></>}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--meta)', marginTop: 2 }}>
            {displayId(p.bookface_id)}
          </div>
        </span>
        {p.id !== user!.id && <MessageLink to={p.id} name={p.full_name} label />}
      </div>
    )
  }

  return (
    <>
      <Chrome current="/people" />
      <div className="wrap cols">
        <div>
          <div className="block">
            <div className="block-hd">
              <h2>Founders</h2>
              <span className="aside">{founders.length}</span>
            </div>
            {founders.map(card)}
          </div>

          <div className="block">
            <div className="block-hd">
              <h2>Partners</h2>
              <span className="aside">{partners.length}</span>
            </div>
            {partners.map(card)}
          </div>
        </div>

        <aside>
          <div className="block">
            <div className="block-hd"><h2>Bookface IDs</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                Your ID is issued with your acceptance and is what you sign in with.
                It is deliberately not your email: batch identity is granted by the
                programme, and it does not follow you out of a company or change when
                your address does.
              </p>
            </div>
          </div>

          <div className="block">
            <div className="block-hd"><h2>Who can do what</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Founders</strong> file their own company&rsquo;s weekly numbers and can
                read only their own. Nobody else can file on their behalf.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Partners</strong> read every company&rsquo;s updates, curate the schedule
                and import the directory &mdash; but cannot write or amend a single number.
                That is enforced in the database, not just hidden in the interface.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
