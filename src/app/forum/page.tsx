import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import NewPost from './NewPost'
import type { Profile, Post } from '@/lib/types'
import { TOPICS, SORTS, type Sort, ago, searchTerms } from '@/lib/forum'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<Post['kind'], string> = {
  ask: 'Ask:',
  share: 'Share:',
  announcement: '',
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string; sort?: string; unanswered?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const topic = (params.topic ?? '').trim()
  const sort = (Object.keys(SORTS).includes(params.sort ?? '') ? params.sort : 'new') as Sort
  const unanswered = params.unanswered === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // search_text carries the question and every reply to it, so a search finds
  // answers that live in the thread rather than only matching titles.
  let query = supabase.from('posts').select('*')
  for (const term of searchTerms(q)) query = query.ilike('search_text', `%${term}%`)
  if (topic) query = query.eq('topic', topic)

  const [postsRes, allTopicsRes, peopleRes, votesRes, commentsRes] = await Promise.all([
    query.order('created_at', { ascending: false }),
    supabase.from('posts').select('topic'),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url'),
    supabase.from('post_votes').select('post_id, user_id'),
    supabase.from('post_comments').select('post_id'),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const votes = (votesRes.data ?? []) as { post_id: string; user_id: string }[]
  const comments = (commentsRes.data ?? []) as { post_id: string }[]
  const allTopics = (allTopicsRes.data ?? []) as { topic: string | null }[]

  const author = (id: string) => people.find(p => p.id === id)
  const voteCount = (id: string) => votes.filter(v => v.post_id === id).length
  const replyCount = (id: string) => comments.filter(c => c.post_id === id).length

  let posts = (postsRes.data ?? []) as Post[]
  if (unanswered) posts = posts.filter(p => replyCount(p.id) === 0)
  if (sort === 'top') posts = [...posts].sort((a, b) => voteCount(b.id) - voteCount(a.id))
  if (sort === 'active') posts = [...posts].sort((a, b) => replyCount(b.id) - replyCount(a.id))

  const total = allTopics.length
  const openCount = posts.length
  const filtered = !!(q || topic || unanswered)

  const href = (over: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (topic) base.topic = topic
    if (sort !== 'new') base.sort = sort
    if (unanswered) base.unanswered = '1'
    for (const [k, v] of Object.entries({ ...base, ...over })) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `/forum?${s}` : '/forum'
  }

  return (
    <>
      <Chrome current="/forum" />
      <div className="wrap cols">
        <div>
          <div className="block">
            <div className="block-hd">
              <h2>Forum</h2>
              <span className="aside">
                {filtered ? `${openCount} of ${total}` : `${total} ${total === 1 ? 'question' : 'questions'}`}
              </span>
            </div>

            <form className="forum-search" action="/forum">
              {topic && <input type="hidden" name="topic" value={topic} />}
              {sort !== 'new' && <input type="hidden" name="sort" value={sort} />}
              {unanswered && <input type="hidden" name="unanswered" value="1" />}
              <input
                type="text" name="q" defaultValue={q}
                placeholder="Search every question and answer…"
                aria-label="Search the forum"
              />
              <button className="btn btn-p btn-sm" type="submit">Search</button>
              {filtered && <a className="btn btn-sm" href="/forum">Clear</a>}
            </form>

            <div className="forum-bar">
              <span className="sorts">
                {(Object.entries(SORTS) as [Sort, string][]).map(([k, label]) => (
                  <Link key={k} href={href({ sort: k === 'new' ? null : k })}
                        className={sort === k ? 'on' : ''}>{label}</Link>
                ))}
              </span>
              <Link href={href({ unanswered: unanswered ? null : '1' })}
                    className={`unans${unanswered ? ' on' : ''}`}>
                Unanswered
              </Link>
            </div>

            {posts.length === 0 ? (
              <div className="empty">
                {q ? (
                  <>
                    <strong>Nothing matches &ldquo;{q}&rdquo;</strong>
                    <p>
                      The search covers every question and every reply. If nothing comes
                      back, nobody has asked this yet &mdash; which makes it worth asking.
                    </p>
                  </>
                ) : total === 0 ? (
                  <>
                    <strong>Nothing posted yet</strong>
                    <p>
                      Ask the thing you are actually stuck on. The useful version names the
                      constraint &mdash; what you tried, what happened, what you cannot get
                      past &mdash; rather than asking for general advice.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Nothing here</strong>
                    <p>No questions match those filters.</p>
                  </>
                )}
              </div>
            ) : posts.map(p => {
              const a = author(p.author_id)
              const replies = replyCount(p.id)
              return (
                <div className="qrow" key={p.id}>
                  <span className="qscore">
                    <strong>{voteCount(p.id)}</strong>
                    <span>{voteCount(p.id) === 1 ? 'vote' : 'votes'}</span>
                  </span>
                  <span className={`qscore${p.accepted_comment_id ? ' solved' : replies ? ' has' : ''}`}>
                    <strong>{replies}</strong>
                    <span>{replies === 1 ? 'answer' : 'answers'}</span>
                  </span>
                  <span className="qmain">
                    <Link href={`/forum/${p.id}`} className="qtitle">
                      {KIND_LABEL[p.kind] && <strong>{KIND_LABEL[p.kind]} </strong>}
                      {p.title}
                    </Link>
                    <span className="qmeta">
                      {p.topic && (
                        <Link href={href({ topic: p.topic, q: null })} className="topictag">{p.topic}</Link>
                      )}
                      {a?.full_name ?? 'Unknown'}
                      {a?.role === 'partner' && <span className="rolepill">Partner</span>}
                      {' · '}{ago(p.created_at)}
                      {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <aside>
          <NewPost authorId={user.id} />

          <div className="block">
            <div className="block-hd"><h2>Topics</h2></div>
            <div className="quick">
              <Link href={href({ topic: null })} className={topic ? '' : 'on'}>
                All topics <span className="dim">{total}</span>
              </Link>
              {TOPICS.map(t => {
                const n = allTopics.filter(x => x.topic === t).length
                return (
                  <Link key={t} href={href({ topic: t })} className={topic === t ? 'on' : ''}>
                    {t} <span className="dim">{n}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="block">
            <div className="block-hd"><h2>Search before you ask</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              The search reads every reply, not just titles &mdash; most answers are
              buried in a thread rather than named in the question. A problem someone
              already solved is usually faster to find than to re-ask.
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
