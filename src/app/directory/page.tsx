import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import MessageLink from '@/components/MessageLink'
import ImportCsv from './ImportCsv'
import type { Profile, DirectoryCompany } from '@/lib/types'
import { matchAccount } from '@/lib/people'

export const dynamic = 'force-dynamic'

function mark(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function options(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ''))).sort()
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; batch?: string; industry?: string; location?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const batchFilter = (params.batch ?? '').trim()
  const industryFilter = (params.industry ?? '').trim()
  const locationFilter = (params.location ?? '').trim()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [meRes, peopleRes, coRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id').eq('id', user.id).single(),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id'),
    supabase.from('directory_companies').select('*').order('name'),
  ])

  const profile = meRes.data as Profile | null
  const people = (peopleRes.data ?? []) as Profile[]
  const all = (coRes.data ?? []) as DirectoryCompany[]
  const total = all.length

  // Filtering happens here rather than in the query because founder names live
  // in an array column, and a batch directory is a few hundred rows at most.
  const needle = q.toLowerCase()
  const companies = all.filter(c => {
    if (batchFilter && c.batch !== batchFilter) return false
    if (industryFilter && c.industry !== industryFilter) return false
    if (locationFilter && c.location !== locationFilter) return false
    if (!needle) return true
    return [c.name, c.one_liner, c.industry, c.location, ...(c.founders ?? [])]
      .some(v => v?.toLowerCase().includes(needle))
  })

  const batches = options(all.map(c => c.batch))
  const industries = options(all.map(c => c.industry))
  const locations = options(all.map(c => c.location))

  const filtered = !!(q || batchFilter || industryFilter || locationFilter)

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
                <input id="q" name="q" type="text" defaultValue={q} placeholder="Company or founder" />
              </div>
              <div className="filter-grid">
              {batches.length > 0 && (
                <div className="field">
                  <label htmlFor="batch">Batch</label>
                  <select id="batch" name="batch" defaultValue={batchFilter}>
                    <option value="">All batches</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
              {industries.length > 0 && (
                <div className="field">
                  <label htmlFor="industry">Industry</label>
                  <select id="industry" name="industry" defaultValue={industryFilter}>
                    <option value="">All industries</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              )}
              {locations.length > 0 && (
                <div className="field">
                  <label htmlFor="location">Location</label>
                  <select id="location" name="location" defaultValue={locationFilter}>
                    <option value="">Anywhere</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-p btn-sm" type="submit">Apply</button>
                {filtered && <a className="btn btn-sm" href="/directory">Clear</a>}
              </div>
            </div>
          </form>

          <div className="block about-list">
            <div className="block-hd"><h2>About this list</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                Company name, what they do, batch, location and founder names &mdash; the
                same facts a company publishes about itself. Nothing private about a
                person is listed here, and nothing has been invented to pad it out.
              </p>
            </div>
          </div>
        </aside>

        <div className="block">
          <div className="block-hd">
            <h2>Companies</h2>
            <span className="aside">
              {total === 0
                ? 'Empty'
                : filtered
                  ? `${companies.length} of ${total}`
                  : `${total} ${total === 1 ? 'company' : 'companies'}`}
              {profile?.role === 'partner' && <> &middot; <ImportCsv /></>}
            </span>
          </div>

          {total === 0 ? (
            <div className="empty">
              <strong>The directory is empty</strong>
              <p>
                Nothing has been imported yet, and nothing has been invented to fill the
                gap. {profile?.role === 'partner'
                  ? 'Use Import CSV above to load a real batch list — one header row, a name column, and whatever else you have.'
                  : 'Your group partner can import a batch list.'}
              </p>
            </div>
          ) : companies.length === 0 ? (
            <div className="empty">
              <strong>No matches</strong>
              <p>Nothing in the directory matches those filters.</p>
            </div>
          ) : (
            <div className="dc-list">
              {companies.map(c => {
                const founders = c.founders ?? []
                return (
                  <article className="dc" key={c.id}>
                    <span className="dc-mark" aria-hidden="true">{mark(c.name)}</span>
                    <div className="dc-main">
                      <h3 className="dc-name">
                        {c.website
                          ? <a href={c.website} target="_blank" rel="noreferrer">{c.name}</a>
                          : c.name}
                        {c.batch && <span className="batchtag">{c.batch}</span>}
                        {c.status && <span className="rolepill">{c.status}</span>}
                      </h3>
                      {c.one_liner && <p className="dc-line">{c.one_liner}</p>}
                      <div className="dc-tags">
                        {c.industry && <span className="tag">{c.industry}</span>}
                        {c.location && <span className="tag">{c.location}</span>}
                        {c.team_size != null && (
                          <span className="tag">{c.team_size} {c.team_size === 1 ? 'person' : 'people'}</span>
                        )}
                      </div>
                      {founders.length > 0 && (
                        <div className="dc-founders">
                          <span className="eyebrow">Founders</span>
                          {founders.map(name => {
                            const account = matchAccount(name, people)
                            return (
                              <span className="founder" key={name}>
                                {name}
                                {account
                                  ? account.id === user.id
                                    ? <span className="tag">you</span>
                                    : <MessageLink to={account.id} name={name} />
                                  : <span className="offbook" title="Not on Bookface">not on Bookface</span>}
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
          )}
        </div>
      </div>
    </>
  )
}
