import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import ImportCsv from './ImportCsv'
import type { Profile, DirectoryCompany } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; batch?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const batchFilter = (params.batch ?? '').trim()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileRow } = await supabase
    .from('profiles').select('id, full_name, bookface_id, role, title, company_id').eq('id', user.id).single()
  const profile = profileRow as Profile | null

  let query = supabase.from('directory_companies').select('*').order('name')
  if (q) query = query.or(`name.ilike.%${q}%,one_liner.ilike.%${q}%,industry.ilike.%${q}%`)
  if (batchFilter) query = query.eq('batch', batchFilter)

  const { data } = await query
  const companies = (data ?? []) as DirectoryCompany[]

  const { data: allRows } = await supabase.from('directory_companies').select('batch')
  const batches = Array.from(
    new Set(((allRows ?? []) as { batch: string | null }[]).map(r => r.batch).filter(Boolean))
  ).sort() as string[]
  const total = (allRows ?? []).length

  return (
    <>
      <Chrome current="/directory" />
      <div className="wrap">
        <div className="block">
          <div className="block-hd">
            <h2>Companies</h2>
            <span className="aside">
              {total === 0 ? 'Empty' : `${companies.length} shown of ${total}`}
              {profile?.role === 'partner' && <> · <ImportCsv /></>}
            </span>
          </div>

          <form className="pad" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', borderBottom: '1px solid var(--rule)' }}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label htmlFor="q">Search</label>
              <input id="q" name="q" type="text" defaultValue={q} placeholder="Name, description or industry" />
            </div>
            {batches.length > 0 && (
              <div className="field" style={{ margin: 0, width: 130 }}>
                <label htmlFor="batch">Batch</label>
                <select id="batch" name="batch" defaultValue={batchFilter}>
                  <option value="">All</option>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-sm" type="submit">Search</button>
          </form>

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
              <p>Nothing in the directory matches that search.</p>
            </div>
          ) : (
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Company</th><th>What they do</th><th>Batch</th>
                    <th>Industry</th><th>Location</th><th className="num">Team</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                        {c.website
                          ? <a href={c.website} target="_blank" rel="noreferrer">{c.name}</a>
                          : c.name}
                      </td>
                      <td>{c.one_liner ?? <span className="dim">&mdash;</span>}</td>
                      <td>{c.batch ? <span className="batchtag">{c.batch}</span> : <span className="dim">&mdash;</span>}</td>
                      <td>{c.industry ?? <span className="dim">&mdash;</span>}</td>
                      <td>{c.location ?? <span className="dim">&mdash;</span>}</td>
                      <td className="num">{c.team_size ?? <span className="dim">&mdash;</span>}</td>
                      <td>{c.status ?? <span className="dim">&mdash;</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
