'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Post, PostComment } from '@/lib/types'
import { ago } from '@/lib/forum'

export default function Thread({
  post, comments, people, userId, voted, voteCount, commentVotes,
}: {
  post: Post
  comments: PostComment[]
  people: Profile[]
  userId: string
  voted: boolean
  voteCount: number
  commentVotes: { comment_id: string; user_id: string }[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const author = (id: string) => people.find(p => p.id === id)
  const isAsker = post.author_id === userId
  const scoreOf = (cid: string) => commentVotes.filter(v => v.comment_id === cid).length
  const votedOn = (cid: string) => commentVotes.some(v => v.comment_id === cid && v.user_id === userId)

  // The accepted answer first, then whatever the batch voted up, then oldest —
  // so the thing that actually worked is what a reader sees, not the fastest reply.
  const ordered = [...comments].sort((a, b) => {
    if (a.id === post.accepted_comment_id) return -1
    if (b.id === post.accepted_comment_id) return 1
    const d = scoreOf(b.id) - scoreOf(a.id)
    return d !== 0 ? d : a.created_at.localeCompare(b.created_at)
  })

  async function toggleVote() {
    setBusy(true)
    if (voted) {
      await supabase.from('post_votes').delete().eq('post_id', post.id).eq('user_id', userId)
    } else {
      await supabase.from('post_votes').insert({ post_id: post.id, user_id: userId })
    }
    setBusy(false); router.refresh()
  }

  async function toggleCommentVote(cid: string) {
    setBusy(true)
    if (votedOn(cid)) {
      await supabase.from('comment_votes').delete().eq('comment_id', cid).eq('user_id', userId)
    } else {
      await supabase.from('comment_votes').insert({ comment_id: cid, user_id: userId })
    }
    setBusy(false); router.refresh()
  }

  async function toggleAccepted(cid: string) {
    setBusy(true); setError('')
    const next = post.accepted_comment_id === cid ? null : cid
    const { error: dbError } = await supabase
      .from('posts').update({ accepted_comment_id: next }).eq('id', post.id)
    setBusy(false)
    if (dbError) { setError(dbError.message); return }
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
    setReply(''); router.refresh()
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
            {post.topic && <span className="topictag">{post.topic}</span>}
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
          <h2>{comments.length} {comments.length === 1 ? 'answer' : 'answers'}</h2>
          {post.accepted_comment_id && <span className="aside">Answered</span>}
        </div>

        {error && <div className="notice notice-err" style={{ margin: 12 }}>{error}</div>}

        {ordered.length === 0 ? (
          <div className="empty"><p>No answers yet.</p></div>
        ) : ordered.map(c => {
          const ca = author(c.author_id)
          const accepted = c.id === post.accepted_comment_id
          return (
            <div key={c.id} className={`answer${accepted ? ' accepted' : ''}`}>
              <div className="answer-side">
                <button
                  className={`vote${votedOn(c.id) ? ' on' : ''}`}
                  onClick={() => toggleCommentVote(c.id)}
                  disabled={busy}
                  aria-label={votedOn(c.id) ? 'Remove your upvote' : 'Upvote this answer'}
                  title={votedOn(c.id) ? 'Remove your upvote' : 'Upvote this answer'}
                >▲</button>
                <span className="vote-n">{scoreOf(c.id)}</span>
                {accepted && <span className="tick" title="Marked as the answer">✓</span>}
              </div>
              <div className="answer-main">
                <div style={{ fontSize: 11, color: 'var(--meta)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{ca?.full_name}</strong>
                  {ca?.role === 'partner' && <span className="rolepill" style={{ marginLeft: 5 }}>Partner</span>}
                  {' · '}{ago(c.created_at)}
                  {accepted && <span className="acceptedtag">Answer</span>}
                </div>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', maxWidth: '65ch' }}>{c.body}</div>
                {isAsker && (
                  <button className="btn btn-sm" style={{ marginTop: 8 }}
                          onClick={() => toggleAccepted(c.id)} disabled={busy}>
                    {accepted ? 'Unmark as the answer' : 'This answered it'}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <form onSubmit={submitReply} className="pad" style={{ borderTop: '1px solid var(--rule)' }}>
          <div className="field">
            <label htmlFor="reply">Your answer</label>
            <textarea id="reply" rows={4} value={reply} onChange={e => setReply(e.target.value)} />
          </div>
          <button className="btn btn-p btn-sm" type="submit" disabled={busy || !reply.trim()}>
            {busy ? 'Posting…' : 'Answer'}
          </button>
        </form>
      </div>
    </>
  )
}
