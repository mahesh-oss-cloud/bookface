import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import EditProfile from './EditProfile'
import type { Profile, Company, CompanyFact, FactSection } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Order matters: what it does, then what it plugs into, then what the law
// requires of it, then what it charges, then what it is built on.
const SECTIONS: { key: FactSection; title: string; blurb: string }[] = [
  { key: 'product',     title: 'What we ship', blurb: 'The surface a customer actually touches.' },
  { key: 'integration', title: 'Integrations', blurb: 'Where the money and the paperwork come from.' },
  { key: 'compliance',  title: 'Compliance',   blurb: 'What Indian GST requires of every invoice.' },
  { key: 'pricing',     title: 'Pricing',      blurb: 'Five tiers.' },
  { key: 'stack',       title: 'Stack',        blurb: '' },
]

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileRow } = await supabase
    .from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url')
    .eq('id', user.id).single()
  const profile = profileRow as Profile | null

  // A partner has no company of their own, so they are shown the batch's company
  // rather than an empty page.
  const { data: companyRows } = await supabase.from('companies').select('*')
  const companies = (companyRows ?? []) as Company[]
  const company = companies.find(c => c.id === profile?.company_id) ?? companies[0] ?? null

  if (!company) {
    return (
      <>
        <Chrome current="/company" />
        <div className="wrap">
          <div className="block"><div className="empty">
            <strong>No company yet</strong>
            <p>Your account is not attached to a company in this batch.</p>
          </div></div>
        </div>
      </>
    )
  }

  const [factsRes, teamRes] = await Promise.all([
    supabase.from('company_facts').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url')
      .eq('company_id', company.id).order('full_name'),
  ])

  const facts = (factsRes.data ?? []) as CompanyFact[]

  // Alphabetical by first name is meaningless here. People introduce a founding
  // team in this order, so the page does too; anyone with an unlisted title
  // falls to the end rather than disappearing.
  const TITLE_ORDER = ['CEO', 'CTO', 'COO', 'Founder & CFO']
  const rank = (t: string | null) => {
    const i = TITLE_ORDER.indexOf(t ?? '')
    return i === -1 ? TITLE_ORDER.length : i
  }
  const team = ((teamRes.data ?? []) as Profile[])
    .sort((a, b) => rank(a.title) - rank(b.title) || a.full_name.localeCompare(b.full_name))
  const canEdit = profile?.role === 'founder' && profile.company_id === company.id

  return (
    <>
      <Chrome current="/company" />
      <div className="wrap">
        <div className="block">
          <div className="co-hd">
            {company.logo_url && (
              <Image
                src={company.logo_url} alt="" width={76} height={76}
                className="co-logo" style={{ background: company.brand_color ?? undefined }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <h1 className="co-name">{company.name}</h1>
              <p className="co-line">{company.one_liner}</p>
              <div className="co-meta">
                {company.sector && <span>{company.sector}</span>}
                {company.location && <span>{company.location}</span>}
                {company.founded_year && <span>Founded {company.founded_year}</span>}
                <span className="batchtag">{company.batch_id}</span>
              </div>
            </div>
          </div>
          {company.description && (
            <div className="co-body">
              <p className="co-desc">{company.description}</p>
              <dl className="co-glance">
                <dt>Batch</dt><dd>{company.batch_id}</dd>
                <dt>Sector</dt><dd>{company.sector ?? '—'}</dd>
                <dt>Location</dt><dd>{company.location ?? '—'}</dd>
                <dt>Founded</dt><dd>{company.founded_year ?? '—'}</dd>
                <dt>Team</dt><dd>{team.length}</dd>
                <dt>Website</dt>
                <dd>
                  {company.website
                    ? <a href={company.website} target="_blank" rel="noreferrer noopener">{company.website.replace(/^https?:\/\//, '')}</a>
                    : 'Not set'}
                </dd>
              </dl>
            </div>
          )}
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            {SECTIONS.map(section => {
              const rows = facts.filter(f => f.section === section.key)
              if (rows.length === 0) return null
              return (
                <div className="block" key={section.key}>
                  <div className="block-hd">
                    <h2>{section.title}</h2>
                    {section.blurb && <span className="aside">{section.blurb}</span>}
                  </div>
                  {rows.map(f => (
                    <div className="row" key={f.id}>
                      <span className="what">
                        <strong>{f.label}</strong>
                        {f.detail && (
                          <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 2, lineHeight: 1.6 }}>
                            {f.detail}
                          </div>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <aside>
            <div className="block">
              <div className="block-hd">
                <h2>Team</h2>
                <span className="aside">{team.length} founders</span>
              </div>
              {team.map(t => (
                <div className="row" key={t.id}>
                  <span className="what">
                    <strong>{t.full_name}</strong>
                    {t.id === user.id && <span className="tag" style={{ marginLeft: 6 }}>you</span>}
                    <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 1 }}>{t.title}</div>
                  </span>
                </div>
              ))}
            </div>

            {canEdit ? <EditProfile company={company} /> : (
              <div className="block">
                <div className="block-hd"><h2>Read only</h2></div>
                <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                  <p style={{ margin: 0 }}>
                    A company&rsquo;s profile is written by its own founders. You can read it;
                    the database refuses a write from anyone else, which is why there is no
                    form here rather than a form that fails.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
