'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Post, PostComment } from '@/lib/types'

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Thread({
  post, comments, people, userId, voted, voteCount,
}: {
  post: Post
  comments: PostComment[]
  people: Profile[]
  userId: string
  voted: boolean
  voteCount: number
}) {
  const router = useRouter()
  const supabase = createClient()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const author = (id: string) => people.find(p => p.id === id)

  async function toggleVote() {
    setBusy(true)
    if (voted) {
      await supabase.from('post_votes').delete().eq('post_id', post.id).eq('user_id', userId)
    } else {
      await supabase.from('post_votes').insert({ post_id: post.id, user_id: userId })
    }
    setBusy(false)
    router.refresh()
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setBusy(true); setError('')

    const { error: dbError } = await supabase.from('post_comments').insert({
      post_id: post.id, author_id: userId, body: reply.trim(),
    })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setReply('')
    router.refresh()
  }

  const a = author(post.author_id)

  return (
    <>
      <div className="block">
        <div className="pad">
          <h1 style={{ margin: 0, fontSize: 17, lineHeight: 1.35 }}>
            {post.kind === 'ask' && <span style={{ color: 'var(--ink)' }}>Ask: </span>}
            {post.kind === 'share' && <span style={{ color: 'var(--ink)' }}>Share: </span>}
            {post.title}
          </h1>
          <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 4 }}>
            {a?.full_name}
            {a?.role === 'partner' && <span className="rolepill" style={{ marginLeft: 5 }}>Partner</span>}
            {' · '}{ago(post.created_at)}
            {post.tags.map(t => <span key={t} className="tag" style={{ marginLeft: 4 }}>{t}</span>)}
          </div>

          {post.body && (
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', maxWidth: '65ch', color: 'var(--ink-2)' }}>
              {post.body}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button className={`btn btn-sm ${voted ? 'btn-p' : ''}`} onClick={toggleVote} disabled={busy}>
              {voted ? 'Upvoted' : 'Upvote'} · {voteCount}
            </button>
          </div>
        </div>
      </div>

      <div className="block">
        <div className="block-hd">
          <h2>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</h2>
        </div>

        {comments.length === 0 ? (
          <div className="empty"><p>No replies yet.</p></div>
        ) : comments.map(c => {
          const ca = author(c.author_id)
          return (
            <div key={c.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--rule-soft)' }}>
              <div style={{ fontSize: 11, color: 'var(--meta)' }}>
                <strong style={{ color: 'var(--ink)' }}>{ca?.full_name}</strong>
                {ca?.role === 'partner' && <span className="rolepill" style={{ marginLeft: 5 }}>Partner</span>}
                {' · '}{ago(c.created_at)}
              </div>
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: '65ch' }}>{c.body}</div>
            </div>
          )
        })}

        <form onSubmit={submitReply} className="pad" style={{ borderTop: '1px solid var(--rule)' }}>
          <div className="field">
            <label htmlFor="reply">Reply</label>
            <textarea id="reply" rows={4} value={reply} onChange={e => setReply(e.target.value)} />
          </div>
          {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-p btn-sm" type="submit" disabled={busy || !reply.trim()}>
            {busy ? 'Posting…' : 'Reply'}
          </button>
        </form>
      </div>
    </>
  )
}
