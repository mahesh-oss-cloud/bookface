'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewPost({ authorId }: { authorId: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<'ask' | 'share' | 'announcement'>('ask')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Give it a title.'); return }
    setBusy(true); setError('')

    const supabase = createClient()
    const { error: dbError } = await supabase.from('posts').insert({
      author_id: authorId,
      kind,
      title: title.trim(),
      body: body.trim() || null,
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setTitle(''); setBody(''); setTags('')
    router.refresh()
  }

  return (
    <div className="block">
      <div className="block-hd"><h2>New post</h2></div>
      <form onSubmit={submit} className="pad">
        <div className="field">
          <label htmlFor="kind">Kind</label>
          <select id="kind" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>
            <option value="ask">Ask &mdash; a question</option>
            <option value="share">Share &mdash; something you learned</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="body">Detail</label>
          <textarea id="body" rows={5} value={body} onChange={e => setBody(e.target.value)} />
          <div className="hint">What you tried, what happened, what you cannot get past.</div>
        </div>
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" type="text" value={tags} placeholder="fundraising, hiring"
                 onChange={e => setTags(e.target.value)} />
        </div>
        {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-p btn-sm" type="submit" disabled={busy}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  )
}
