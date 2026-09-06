import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import Thread from './Thread'
import type { Profile, Post, PostComment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: postRow } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  if (!postRow) notFound()
  const post = postRow as Post

  const [peopleRes, commentsRes, votesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, title, company_id'),
    supabase.from('post_comments').select('*').eq('post_id', id).order('created_at'),
    supabase.from('post_votes').select('post_id, user_id').eq('post_id', id),
  ])

  const people = (peopleRes.data ?? []) as Profile[]
  const comments = (commentsRes.data ?? []) as PostComment[]
  const votes = (votesRes.data ?? []) as { user_id: string }[]

  return (
    <>
      <Chrome current="/forum" />
      <div className="wrap cols">
        <div>
          <div style={{ fontSize: 11, marginBottom: 8 }}>
            <Link href="/forum">&larr; Forum</Link>
          </div>
          <Thread
            post={post}
            comments={comments}
            people={people}
            userId={user.id}
            voted={votes.some(v => v.user_id === user.id)}
            voteCount={votes.length}
          />
        </div>
        <aside>
          <div className="block">
            <div className="block-hd"><h2>Answering well</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              The answers worth reading say what you actually did and what it cost. A
              recommendation with no numbers behind it is just a preference.
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
