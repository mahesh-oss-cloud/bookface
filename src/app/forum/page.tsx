import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import NewPost from './NewPost'
import type { Profile, Post } from '@/lib/types'

export const dynamic = 'force-dynamic'

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const KIND_LABEL: Record<Post['kind'], string> = {
  ask: 'Ask:',
  share: 'Share:',
  announcement: '',
}

export default async function ForumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [postsRes, peopleRes, votesRes, commentsRes] = await Promise.all([
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id'),
    supabase.from('post_votes').select('post_id, user_id'),
    supabase.from('post_comments').select('post_id'),
  ])

  const posts = (postsRes.data ?? []) as Post[]
  const people = (peopleRes.data ?? []) as Profile[]
  const votes = (votesRes.data ?? []) as { post_id: string; user_id: string }[]
  const comments = (commentsRes.data ?? []) as { post_id: string }[]

  const author = (id: string) => people.find(p => p.id === id)
  const voteCount = (id: string) => votes.filter(v => v.post_id === id).length
  const commentCount = (id: string) => comments.filter(c => c.post_id === id).length

  return (
    <>
      <Chrome current="/forum" />
      <div className="wrap cols">
        <div>
          <div className="block">
            <div className="block-hd">
              <h2>Forum</h2>
              <span className="aside">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
            </div>

            {posts.length === 0 ? (
              <div className="empty">
                <strong>Nothing posted yet</strong>
                <p>
                  Ask the thing you are actually stuck on. The useful version names the
                  constraint &mdash; what you tried, what happened, what you cannot get past
                  &mdash; rather than asking for general advice.
                </p>
              </div>
            ) : posts.map(p => {
              const a = author(p.author_id)
              return (
                <div key={p.id} style={{ display: 'flex', gap: 9, padding: '8px 12px', borderBottom: '1px solid var(--rule-soft)' }}>
                  <div style={{ width: 34, flex: 'none', textAlign: 'center', paddingTop: 1 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)' }}>
                      {voteCount(p.id)}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/forum/${p.id}`} style={{ fontSize: 13 }}>
                      {KIND_LABEL[p.kind] && <strong style={{ color: 'var(--ink)' }}>{KIND_LABEL[p.kind]} </strong>}
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 2 }}>
                      {a?.full_name ?? 'Unknown'}
                      {a?.role === 'partner' && <span className="rolepill" style={{ marginLeft: 5 }}>Partner</span>}
                      {' · '}{ago(p.created_at)}
                      {' · '}{commentCount(p.id)} {commentCount(p.id) === 1 ? 'reply' : 'replies'}
                      {p.tags.map(t => <span key={t} className="tag" style={{ marginLeft: 4 }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside>
          <NewPost authorId={user.id} />
        </aside>
      </div>
    </>
  )
}
