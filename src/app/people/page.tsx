import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import { BATCH_ID } from '@/lib/identity'
import MessageLink from '@/components/MessageLink'
import type {
  Person, TagFacet, KindFacet, PeopleBatchFacet, BatchFacet,
} from '@/lib/types'
import { initials, shownKinds } from '@/lib/people'
import { searchTerms } from '@/lib/search'

export const dynamic = 'force-dynamic'

const PER_PAGE = 50

const KINDS: Record<string, string> = {
  founder: 'Founders',
  investor: 'Investors',
  partner: 'Partners',
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const kind = KINDS[params.kind ?? ''] ? (params.kind as string) : ''
  const tag = (params.tag ?? '').trim()
  const batch = (params.batch ?? '').trim()
  const here = params.here === '1'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Ten thousand people is well past what a page can filter in memory, so every
  // filter is a query condition and results arrive fifty at a time.
  let query = supabase
    .from('people')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: false })
    .order('name')
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

  // Each word its own ilike, ANDed by PostgREST: "algolia search" finds the
  // person whose company is Algolia and whose tags say Search.
  for (const term of searchTerms(q)) query = query.ilike('search_text', `%${term}%`)
  // A person can be two things, so the filter asks whether the kind is in
  // their set rather than whether it is the one they are filed under.
  if (kind) query = query.contains('kinds', [kind])
  if (tag) query = query.contains('tags', [tag])
  if (batch) query = query.contains('batches', [batch])
  if (here) query = query.eq('account_state', 'active')

  const [listRes, kindRes, tagRes, pBatchRes, dBatchRes, hereRes] = await Promise.all([
    query,
    supabase.from('people_kinds').select('*'),
    supabase.from('people_tags').select('*').order('people', { ascending: false }).limit(60),
    supabase.from('people_batches').select('*'),
    supabase.from('directory_batches').select('*'),
    supabase.from('people').select('id', { count: 'exact', head: true }).eq('account_state', 'active'),
  ])

  const people = (listRes.data ?? []) as Person[]
  const total = listRes.count ?? 0
  const kinds = (kindRes.data ?? []) as KindFacet[]
  const tags = (tagRes.data ?? []) as TagFacet[]
  const signedIn = hereRes.count ?? 0

  // The batch facet counts people; directory_batches carries the readable name
  // and the ordering, so the two are merged rather than duplicated.
  const named = new Map((dBatchRes.data ?? []).map((b: BatchFacet) => [b.batch, b]))
  const batchName = new Map(
    (dBatchRes.data ?? []).map((b: BatchFacet) => [b.batch, b.batch_name ?? b.batch])
  )
  const batches = ((pBatchRes.data ?? []) as PeopleBatchFacet[])
    .map(b => ({ ...b, name: named.get(b.batch)?.batch_name ?? b.batch, sort: named.get(b.batch)?.batch_sort ?? -1 }))
    .sort((a, b) => b.sort - a.sort)

  const filtered = !!(q || kind || tag || batch || here)
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const hrefWith = (over: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    const all = { q, kind, tag, batch, here: here ? '1' : '', page: page > 1 ? String(page) : '', ...over }
    for (const [k, v] of Object.entries(all)) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `/people?${s}` : '/people'
  }
  const pageHref = (n: number) => hrefWith({ page: n > 1 ? String(n) : undefined })

  return (
    <>
      <Chrome current="/people" />
      <div className="wrap cols-dir">
        <aside>
          <form className="block filters">
            <div className="block-hd"><h2>Filter</h2></div>
            <div className="pad">
              <div className="field">
                <label htmlFor="q">Search</label>
                <input id="q" name="q" type="text" defaultValue={q}
                       placeholder="Name, company or subject" />
              </div>
              <div className="filter-grid">
                <div className="field">
                  <label htmlFor="kind">Who</label>
                  <select id="kind" name="kind" defaultValue={kind}>
                    <option value="">Everyone</option>
                    {kinds.map(k => (
                      <option key={k.kind} value={k.kind}>
                        {KINDS[k.kind]} ({k.people.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="tag">Ask about</label>
                  <select id="tag" name="tag" defaultValue={tag}>
                    <option value="">Any subject</option>
                    {tags.map(t => (
                      <option key={t.tag} value={t.tag}>{t.tag} ({t.people.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="batch">Batch</label>
                  <select id="batch" name="batch" defaultValue={batch}>
                    <option value="">All batches</option>
                    {batches.map(b => (
                      <option key={b.batch} value={b.batch}>{b.name} ({b.people.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="check">
                <input type="checkbox" name="here" value="1" defaultChecked={here} />
                <span>Sign-in set up</span>
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-p btn-sm" type="submit">Apply</button>
                {filtered && <a className="btn btn-sm" href="/people">Clear</a>}
              </div>
            </div>
          </form>

          <div className="block about-list">
            <div className="block-hd"><h2>Jump to</h2></div>
            <div className="quick">
              <Link href="/people?here=1">Sign-in set up &mdash; {signedIn}</Link>
              <Link href="/people?kind=partner">Partners</Link>
              <Link href="/people?kind=investor">Investors</Link>
              <Link href={`/people?batch=${BATCH_ID}`}>Your batch &mdash; {BATCH_ID}</Link>
              <Link href="/people">Everyone</Link>
            </div>
          </div>

          <div className="block about-list">
            <div className="block-hd"><h2>About this list</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                Founders are the people their companies name on their own public
                listing. <strong>Works on</strong> is read off what those companies do,
                so it describes the company rather than making a claim about the person.
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Ask me about</strong> is different: it is only ever set by the
                person themselves, from their own page.
              </p>
              <p style={{ margin: '0 0 8px' }}>
                Partners and investors are compiled from public record and each says
                where to check it.
              </p>
              <p style={{ margin: 0 }}>
                Everyone here is on Bookface and holds a Bookface ID. Where a sign-in
                has not been set up yet, a message still lands in their inbox and is
                waiting the first time they log in.
              </p>
            </div>
          </div>
        </aside>

        <div className="block">
          <div className="block-hd">
            <h2>People</h2>
            <span className="aside">
              Showing {people.length} of {total.toLocaleString()}
              {filtered ? ' matching people' : ' people'}
              {pages > 1 && <> &middot; page {page} of {pages.toLocaleString()}</>}
            </span>
          </div>

          {people.length === 0 ? (
            <div className="empty">
              <strong>No matches</strong>
              <p>Nobody in the directory matches those filters.</p>
            </div>
          ) : (
            <>
              <div className="dc-list">
                {people.map(p => {
                  const isYou = p.profile_id === user.id
                  const shown = [...p.expertise, ...p.works_on].slice(0, 5)
                  return (
                    <article className="pr" key={p.id}>
                      {p.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img className="pr-face" src={p.avatar_url} alt="" width={38} height={38} loading="lazy" />
                        : <span className="pr-face" aria-hidden="true">{initials(p.name)}</span>}

                      <div className="pr-main">
                        <h3 className="pr-name">
                          <Link href={`/people/${p.id}`}>{p.name}</Link>
                          {shownKinds(p.kinds).map((k, i) => (
                            <span className={i === 0 ? 'kindpill' : 'kindpill kindpill-2'} key={k}>{k}</span>
                          ))}
                          {isYou && <span className="tag">you</span>}
                          {/* Everyone in here is a member; what varies is whether
                              their sign-in has been set up yet. */}
                          {!isYou && <span className="herepill">On Bookface</span>}
                        </h3>
                        <p className="pr-role">
                          {p.role_title}
                          {p.role_title && p.org && ' · '}
                          {p.org}
                        </p>
                        {p.known_for && <p className="pr-known">{p.known_for}</p>}
                        {(p.batches.length > 0 || shown.length > 0) && (
                          <div className="dc-tags">
                            {/* The batch spelled out, the way the company list
                                spells it — one size down for a person. */}
                            {p.batches.slice(0, 2).map(b => (
                              <Link className="ycpill ycpill-sm" key={b} href={hrefWith({ batch: b, page: undefined })}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/yc-mark.png" alt="" width={14} height={14} />
                                {batchName.get(b) ?? b}
                              </Link>
                            ))}
                            {p.expertise.slice(0, 5).map(t => (
                              <Link className="pill pill-sm pill-own" key={`e-${t}`} href={hrefWith({ tag: t, page: undefined })}>{t}</Link>
                            ))}
                            {p.works_on.slice(0, Math.max(0, 5 - p.expertise.length)).map(t => (
                              <Link className="pill pill-sm" key={`w-${t}`} href={hrefWith({ tag: t, page: undefined })}>{t}</Link>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pr-act">
                        {isYou ? (
                          <Link className="btn btn-sm" href={`/people/${p.id}`}>Your profile</Link>
                        ) : (
                          <>
                            {/* Everyone here is writable to, account or not: a
                                message to a directory entry is kept against it. */}
                            {p.profile_id
                              ? <MessageLink to={p.profile_id} name={p.name} label />
                              : <MessageLink person={p.id} name={p.name} label />}
                            {p.source_url && (
                              <a className="offbook" href={p.source_url} target="_blank" rel="noreferrer">
                                Public record &#8599;
                              </a>
                            )}
                          </>
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
