import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import type { Resource } from '@/lib/types'
import { searchTerms } from '@/lib/forum'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  ['Playbooks', 'How other people did the thing you are about to do'],
  ['Deals', 'Credits and discounts you have to apply for to get'],
  ['Investors', 'Where the lists of investors actually live'],
  ['Legal & Compliance', 'The filings and instruments, mostly India'],
  ['Hiring', 'Where startup-intent candidates already are'],
  ['Distribution', 'Getting the first users and the first customers'],
] as const

function mark(v: string | null): string {
  return (v ?? '?').trim().charAt(0).toUpperCase()
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string; free?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const category = (params.category ?? '').trim()
  const region = (params.region ?? '').trim()
  const freeOnly = params.free === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let query = supabase.from('resources').select('*')
  for (const term of searchTerms(q)) query = query.ilike('search_text', `%${term}%`)
  if (category) query = query.eq('category', category)
  if (region) query = query.eq('region', region)
  if (freeOnly) query = query.in('cost', ['Free', 'Free tier'])

  const [listRes, allRes] = await Promise.all([
    query.order('category').order('sort_order'),
    supabase.from('resources').select('category, region'),
  ])

  const items = (listRes.data ?? []) as Resource[]
  const all = (allRes.data ?? []) as { category: string; region: string }[]
  const total = all.length
  const filtered = !!(q || category || region || freeOnly)

  const href = (over: Record<string, string | null>) => {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (category) base.category = category
    if (region) base.region = region
    if (freeOnly) base.free = '1'
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `/resources?${s}` : '/resources'
  }

  // Group into category blocks so a browse reads as sections rather than one
  // undifferentiated list.
  const groups = CATEGORIES
    .map(([name, blurb]) => ({ name, blurb, rows: items.filter(r => r.category === name) }))
    .filter(g => g.rows.length > 0)

  return (
    <>
      <Chrome current="/resources" />
      <div className="wrap cols-dir">
        <aside>
          <form className="block filters">
            <div className="block-hd"><h2>Filter</h2></div>
            <div className="pad">
              <div className="field">
                <label htmlFor="q">Search</label>
                <input id="q" name="q" type="text" defaultValue={q}
                       placeholder="Credits, SAFE, pricing…" />
              </div>
              <div className="field">
                <label htmlFor="region">Region</label>
                <select id="region" name="region" defaultValue={region}>
                  <option value="">Everywhere</option>
                  <option value="Global">Global</option>
                  <option value="India">India</option>
                </select>
              </div>
              <label className="check">
                <input type="checkbox" name="free" value="1" defaultChecked={freeOnly} />
                <span>Free only</span>
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-p btn-sm" type="submit">Apply</button>
                {filtered && <a className="btn btn-sm" href="/resources">Clear</a>}
              </div>
            </div>
          </form>

          <div className="block">
            <div className="block-hd"><h2>Categories</h2></div>
            <div className="quick">
              <Link href={href({ category: null })} className={category ? '' : 'on'}>
                Everything <span className="dim">{total}</span>
              </Link>
              {CATEGORIES.map(([name]) => (
                <Link key={name} href={href({ category: name })} className={category === name ? 'on' : ''}>
                  {name} <span className="dim">{all.filter(r => r.category === name).length}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="block about-list">
            <div className="block-hd"><h2>What this is</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                Every one of these is public. We have no private stash, and pretending
                otherwise would just waste your time &mdash; what is here is the
                curation: what is actually worth reading, and what the catch is.
              </p>
              <p style={{ margin: 0 }}>
                Credit amounts and eligibility change often. The figures are what the
                programme published when this was compiled &mdash; treat them as a
                reason to look, not as terms.
              </p>
            </div>
          </div>
        </aside>

        <div>
          {items.length === 0 ? (
            <div className="block">
              <div className="block-hd"><h2>Resources</h2></div>
              <div className="empty">
                <strong>Nothing matches</strong>
                <p>No resource matches those filters.</p>
              </div>
            </div>
          ) : groups.map(g => (
            <div className="block" key={g.name}>
              <div className="block-hd">
                <h2>{g.name}<span className="convo-sub">{g.blurb}</span></h2>
                <span className="aside">{g.rows.length}</span>
              </div>
              <div className="dc-list">
                {g.rows.map(r => (
                  <article className="res" key={r.id}>
                    <span className="res-mark" aria-hidden="true">{mark(r.provider ?? r.title)}</span>
                    <div className="res-main">
                      <h3 className="res-name">
                        <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                        {r.provider && <span className="res-by">{r.provider}</span>}
                        {r.region === 'India' && <span className="topictag">India</span>}
                        {r.cost && (
                          <span className={`cost ${r.cost === 'Paid' ? 'paid' : ''}`}>{r.cost}</span>
                        )}
                      </h3>
                      {r.description && <p className="dc-line">{r.description}</p>}
                      <div className="dc-tags">
                        {r.detail && <span className="detail">{r.detail}</span>}
                        {r.tags.map(t => <span key={t} className="tag">{t}</span>)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
