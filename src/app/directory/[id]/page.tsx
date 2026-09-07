import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import MessageLink from '@/components/MessageLink'
import type { Profile, DirectoryCompany, DirectoryFounder } from '@/lib/types'
import { matchAccount, initials } from '@/lib/people'

export const dynamic = 'force-dynamic'

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: row } = await supabase
    .from('directory_companies').select('*').eq('id', id).maybeSingle()
  if (!row) notFound()
  const c = row as DirectoryCompany

  const [foundersRes, peopleRes] = await Promise.all([
    supabase.from('directory_founders').select('*').eq('company_id', c.id).order('sort_order'),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url'),
  ])

  const founders = (foundersRes.data ?? []) as DirectoryFounder[]
  const people = (peopleRes.data ?? []) as Profile[]

  // Companies in the same batch — the reason to be in here rather than on a
  // public listing is that the batch around you is one click away.
  const { data: batchRows } = c.batch
    ? await supabase.from('directory_companies')
        .select('id, name, one_liner, logo_url')
        .eq('batch', c.batch).neq('id', c.id).order('name').limit(8)
    : { data: [] }
  const batchmates = (batchRows ?? []) as Pick<DirectoryCompany,
    'id' | 'name' | 'one_liner' | 'logo_url'>[]

  // The listing stores sub-industry as "B2B -> Sales"; only the leaf is worth
  // showing, and only when it says something the industry row didn't.
  const sub = c.subindustry?.replace(/^.*->\s*/, '').trim()

  const facts: [string, string][] = []
  if (c.batch_name) facts.push(['Batch', c.batch_name])
  if (c.industry) facts.push(['Industry', c.industry])
  if (sub && sub !== c.industry) facts.push(['Sub-industry', sub])
  if (c.location) facts.push(['Location', c.location])
  if (c.team_size != null && c.team_size > 0) facts.push(['Team size', c.team_size.toLocaleString()])
  if (c.stage) facts.push(['Stage', c.stage])
  if (c.status) facts.push(['Status', c.status])

  return (
    <>
      <Chrome current="/directory" />
      <div className="wrap cols">
        <div>
          <div style={{ fontSize: 11, marginBottom: 8 }}>
            <Link href="/directory">&larr; Companies</Link>
            {c.batch && <> &middot; <Link href={`/directory?batch=${c.batch}`}>{c.batch}</Link></>}
          </div>

          <div className="block">
            <div className="co-hero">
              {c.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="co-logo" src={c.logo_url} alt="" width={56} height={56} />
                : <span className="co-logo co-logo-fb" aria-hidden="true">
                    {c.name.trim().charAt(0).toUpperCase() || '?'}
                  </span>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 className="co-title">
                  {c.name}
                  {c.batch && <span className="batchtag">{c.batch}</span>}
                  {c.top_company && <span className="toptag">Top</span>}
                  {c.status && c.status !== 'Active' && <span className="rolepill">{c.status}</span>}
                </h1>
                {c.one_liner && <p className="co-liner">{c.one_liner}</p>}
                <div className="dc-tags" style={{ marginTop: 8 }}>
                  {c.website && (
                    <a className="btn btn-sm" href={c.website} target="_blank" rel="noreferrer">
                      Visit website ↗
                    </a>
                  )}
                  {c.tags?.slice(0, 6).map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
            </div>
          </div>

          {c.description && (
            <div className="block">
              <div className="block-hd"><h2>What they do</h2></div>
              <div className="pad">
                <p style={{ margin: 0, maxWidth: '68ch', lineHeight: 1.65, color: 'var(--ink-2)' }}>
                  {c.description}
                </p>
              </div>
            </div>
          )}

          <div className="block">
            <div className="block-hd">
              <h2>Founders</h2>
              <span className="aside">{founders.length}</span>
            </div>
            {founders.length === 0 ? (
              <div className="empty">
                <strong>No founders listed</strong>
                <p>Nobody has been recorded against this company yet.</p>
              </div>
            ) : founders.map(f => {
              const accountId = f.profile_id ?? matchAccount(f.name, people)?.id ?? null
              const isYou = accountId === user.id
              return (
                <div className="co-founder" key={f.id}>
                  {f.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="co-face" src={f.avatar_url} alt="" width={40} height={40} />
                    : <span className="co-face" aria-hidden="true">{initials(f.name)}</span>}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="co-fname">
                      {f.name}
                      {isYou && <span className="tag">you</span>}
                    </div>
                    {f.title && <div className="co-ftitle">{f.title}</div>}
                    {f.linkedin_url && (
                      <a className="co-flink" href={f.linkedin_url} target="_blank" rel="noreferrer">
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                  {!isYou && (
                    accountId
                      ? <MessageLink to={accountId} name={f.name} label />
                      : <MessageLink founder={f.id} name={f.name} label />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <aside>
          <div className="block">
            <div className="block-hd"><h2>At a glance</h2></div>
            {facts.length === 0 ? (
              <div className="pad dim" style={{ fontSize: 12 }}>Nothing recorded.</div>
            ) : (
              <dl className="co-facts">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {c.regions?.length > 0 && (
            <div className="block">
              <div className="block-hd"><h2>Regions</h2></div>
              <div className="pad dc-tags">
                {c.regions.map(r => (
                  <Link key={r} className="tag" href={`/directory?region=${encodeURIComponent(r)}`}>{r}</Link>
                ))}
              </div>
            </div>
          )}

          {batchmates.length > 0 && (
            <div className="block">
              <div className="block-hd">
                <h2>Also in {c.batch}</h2>
                <Link className="aside" href={`/directory?batch=${c.batch}`}>All</Link>
              </div>
              <div className="quick">
                {batchmates.map(b => (
                  <Link key={b.id} href={`/directory/${b.id}`}>{b.name}</Link>
                ))}
              </div>
            </div>
          )}

          {c.yc_url && (
            <div className="block">
              <div className="block-hd"><h2>Elsewhere</h2></div>
              <div className="pad" style={{ fontSize: 11, lineHeight: 1.7 }}>
                <a href={c.yc_url} target="_blank" rel="noreferrer">Public listing ↗</a>
                <p style={{ margin: '6px 0 0', color: 'var(--meta)' }}>
                  Everything above is already here &mdash; this is only if you want the
                  public page.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
