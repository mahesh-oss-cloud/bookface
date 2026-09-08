import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import { BATCH_ID } from '@/lib/identity'
import MessageLink from '@/components/MessageLink'
import ImportCsv from './ImportCsv'
import type { Profile, DirectoryCompany, DirectoryFounder, BatchFacet, NameFacet } from '@/lib/types'
import { matchAccount, initials } from '@/lib/people'

export const dynamic = 'force-dynamic'

const PER_PAGE = 50

/** PostgREST reads commas and parens as syntax inside or(), so strip them. */
function safeLike(v: string): string {
  return v.replace(/[,()*\\]/g, ' ').trim()
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const batch = (params.batch ?? '').trim()
  const industry = (params.industry ?? '').trim()
  const region = (params.region ?? '').trim()
  const top = params.top === '1'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 6,203 companies is far past the point where the page can filter in memory,
  // so every filter is a query condition and results come back one page at a time.
  let query = supabase
    .from('directory_companies')
    .select('*', { count: 'exact' })
    .order('batch_sort', { ascending: false, nullsFirst: false })
    .order('name')
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

  const needle = safeLike(q)
  if (needle) query = query.ilike('search_text', `%${needle}%`)
  if (batch) query = query.eq('batch', batch)
  if (industry) query = query.eq('industry', industry)
  if (region) query = query.contains('regions', [region])
  if (top) query = query.eq('top_company', true)

  const [meRes, peopleRes, listRes, batchRes, indRes, regRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url').eq('id', user.id).single(),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url'),
    query,
    supabase.from('directory_batches').select('*').order('batch_sort', { ascending: false }),
    supabase.from('directory_industries').select('*').order('companies', { ascending: false }),
    supabase.from('directory_regions').select('*').order('companies', { ascending: false }).limit(30),
  ])

  const profile = meRes.data as Profile | null
  const people = (peopleRes.data ?? []) as Profile[]
  const companies = (listRes.data ?? []) as DirectoryCompany[]
  const total = listRes.count ?? 0
  const batches = (batchRes.data ?? []) as BatchFacet[]
  const industries = (indRes.data ?? []) as NameFacet[]
  const regions = (regRes.data ?? []) as NameFacet[]

  // Founders are fetched only for the fifty companies actually on this page —
  // there are 10,841 of them in total.
  const { data: founderRows } = companies.length
    ? await supabase
        .from('directory_founders')
        .select('*')
        .in('company_id', companies.map(c => c.id))
        .order('sort_order')
    : { data: [] }

  // One row per person in the directory, so the envelope on a founder's name
  // opens a thread with the person rather than with a line on a company page.
  // Matched by row id rather than by name, because two people can share a name.
  const founderRowList = (founderRows ?? []) as DirectoryFounder[]
  const { data: personRows } = founderRowList.length
    ? await supabase.from('people').select('id, founder_ids, profile_id')
        .overlaps('founder_ids', founderRowList.map(f => f.id))
    : { data: [] }
  const personByFounder = new Map<string, { id: string; profile_id: string | null }>()
  for (const r of (personRows ?? []) as { id: string; founder_ids: string[]; profile_id: string | null }[]) {
    for (const fid of r.founder_ids) personByFounder.set(fid, { id: r.id, profile_id: r.profile_id })
  }

  const foundersByCompany = new Map<string, DirectoryFounder[]>()
  for (const f of founderRowList) {
    foundersByCompany.set(f.company_id, [...(foundersByCompany.get(f.company_id) ?? []), f])
  }

  const filtered = !!(q || batch || industry || region || top)
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const pageHref = (n: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (batch) sp.set('batch', batch)
    if (industry) sp.set('industry', industry)
    if (region) sp.set('region', region)
    if (top) sp.set('top', '1')
    if (n > 1) sp.set('page', String(n))
    const s = sp.toString()
    return s ? `/directory?${s}` : '/directory'
  }

  return (
    <>
      <Chrome current="/directory" />
      <div className="wrap cols-dir">
        <aside>
          <form className="block filters">
            <div className="block-hd"><h2>Filter</h2></div>
            <div className="pad">
              <div className="field">
                <label htmlFor="q">Search</label>
                <input id="q" name="q" type="text" defaultValue={q}
                       placeholder="Company, founder or keyword" />
              </div>
              <div className="filter-grid">
                <div className="field">
                  <label htmlFor="batch">Batch</label>
                  <select id="batch" name="batch" defaultValue={batch}>
                    <option value="">All batches</option>
                    {batches.map(b => (
                      <option key={b.batch} value={b.batch}>
                        {b.batch_name ?? b.batch} ({b.companies})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="industry">Industry</label>
                  <select id="industry" name="industry" defaultValue={industry}>
                    <option value="">All industries</option>
                    {industries.map(i => (
                      <option key={i.industry} value={i.industry}>{i.industry} ({i.companies})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="region">Region</label>
                  <select id="region" name="region" defaultValue={region}>
                    <option value="">Anywhere</option>
                    {regions.map(r => (
                      <option key={r.region} value={r.region}>{r.region} ({r.companies})</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="check">
                <input type="checkbox" name="top" value="1" defaultChecked={top} />
                <span>Top companies only</span>
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-p btn-sm" type="submit">Apply</button>
                {filtered && <a className="btn btn-sm" href="/directory">Clear</a>}
              </div>
            </div>
          </form>

          <div className="block about-list">
            <div className="block-hd"><h2>Jump to</h2></div>
            <div className="quick">
              <Link href={`/directory?batch=${BATCH_ID}`}>Your batch &mdash; {BATCH_ID}</Link>
              <Link href="/directory?top=1">Top companies</Link>
              <Link href="/directory?region=India">India</Link>
              <Link href="/directory">Everything</Link>
            </div>
          </div>

          <div className="block about-list">
            <div className="block-hd"><h2>About this list</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                Every company with a public page in the accelerator&rsquo;s directory
                &mdash; name, logo, what they do, batch, industry, location, team size
                and status, with the founders each company lists. All of it is the
                company&rsquo;s own public listing.
              </p>
              <p style={{ margin: 0 }}>
                A founder&rsquo;s name links to the profile they published, and the
                envelope opens a conversation with them. A thread stays between the
                two of you.
              </p>
            </div>
          </div>
        </aside>

        <div className="block">
          <div className="block-hd">
            <h2>Companies</h2>
            <span className="aside">
              {total.toLocaleString()} {filtered ? 'matching' : 'companies'}
              {pages > 1 && <> &middot; page {page} of {pages.toLocaleString()}</>}
              {profile?.role === 'partner' && <> &middot; <ImportCsv /></>}
            </span>
          </div>

          {companies.length === 0 ? (
            <div className="empty">
              <strong>No matches</strong>
              <p>Nothing in the directory matches those filters.</p>
            </div>
          ) : (
            <>
              <div className="dc-list">
                {companies.map(c => {
                  const founders = foundersByCompany.get(c.id) ?? []
                  return (
                    <article className="dc" key={c.id}>
                      {c.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img className="dc-logo" src={c.logo_url} alt="" width={34} height={34} loading="lazy" />
                        : <span className="dc-mark" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase() || '?'}</span>}
                      <div className="dc-main">
                        <h3 className="dc-name">
                          {/* Inward, to our own profile. Bouncing straight out to the
                              public listing would defeat the point of the network. */}
                          <Link href={`/directory/${c.id}`}>{c.name}</Link>
                          {c.batch && <span className="batchtag">{c.batch}</span>}
                          {c.top_company && <span className="toptag">Top</span>}
                          {c.status && c.status !== 'Active' && <span className="rolepill">{c.status}</span>}
                        </h3>
                        {c.one_liner && <p className="dc-line">{c.one_liner}</p>}
                        <div className="dc-tags">
                          {c.industry && <span className="tag">{c.industry}</span>}
                          {c.location && <span className="tag">{c.location}</span>}
                          {c.team_size != null && c.team_size > 0 && (
                            <span className="tag">{c.team_size.toLocaleString()} {c.team_size === 1 ? 'person' : 'people'}</span>
                          )}
                          <Link className="tag" href={`/directory/${c.id}`}>Profile</Link>
                        </div>
                        {founders.length > 0 && (
                          <div className="dc-founders">
                            <span className="eyebrow">Founders</span>
                            {founders.map(f => {
                              // profile_id is the authoritative link once a founder
                              // holds an account; the name match is the fallback.
                              const entry = personByFounder.get(f.id)
                              const accountId = f.profile_id ?? entry?.profile_id
                                ?? matchAccount(f.name, people)?.id ?? null
                              return (
                                <span className="founder" key={f.id}>
                                  {f.avatar_url
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img className="founder-av" src={f.avatar_url} alt=""
                                           width={20} height={20} loading="lazy" />
                                    : <span className="founder-av" aria-hidden="true">{initials(f.name)}</span>}
                                  {/* Plain text here; the profile link lives on the
                                      company page rather than throwing you offsite. */}
                                  {f.name}
                                  {f.title && <span className="founder-title">{f.title}</span>}
                                  {accountId === user.id
                                    ? <span className="tag">you</span>
                                    : accountId
                                      ? <MessageLink to={accountId} name={f.name} />
                                      : <MessageLink person={entry?.id} name={f.name} />}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              {pages > 1 && (
                <nav className="pager" aria-label="Pages">
                  {page > 1
                    ? <Link className="btn btn-sm" href={pageHref(page - 1)}>&larr; Previous</Link>
                    : <span className="btn btn-sm" aria-disabled="true">&larr; Previous</span>}
                  <span className="pager-at">
                    {((page - 1) * PER_PAGE + 1).toLocaleString()}&ndash;
                    {Math.min(page * PER_PAGE, total).toLocaleString()} of {total.toLocaleString()}
                  </span>
                  {page < pages
                    ? <Link className="btn btn-sm" href={pageHref(page + 1)}>Next &rarr;</Link>
                    : <span className="btn btn-sm" aria-disabled="true">Next &rarr;</span>}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
