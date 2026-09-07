'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TOPICS, searchTerms } from '@/lib/forum'

type Similar = { id: string; title: string; topic: string | null }

export default function NewPost({ authorId }: { authorId: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<'ask' | 'share' | 'announcement'>('ask')
  const [topic, setTopic] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [similar, setSimilar] = useState<Similar[]>([])

  // The best outcome of asking is finding it already answered, so the archive
  // is searched while the title is still being typed rather than after posting.
  useEffect(() => {
    const terms = searchTerms(title)
    if (terms.length === 0 || title.trim().length < 4) { setSimilar([]); return }
    const timer = setTimeout(async () => {
      let q = createClient().from('posts').select('id, title, topic')
      for (const term of terms) q = q.ilike('search_text', `%${term}%`)
      const { data } = await q.limit(4)
      setSimilar((data ?? []) as Similar[])
    }, 350)
    return () => clearTimeout(timer)
  }, [title])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Give it a title.'); return }
    setBusy(true); setError('')

    const supabase = createClient()
    const { error: dbError } = await supabase.from('posts').insert({
      author_id: authorId,
      kind,
      topic: topic || null,
      title: title.trim(),
      body: body.trim() || null,
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setTitle(''); setBody(''); setTags(''); setSimilar([])
    router.refresh()
  }

  return (
    <div className="block">
      <div className="block-hd"><h2>Ask the batch</h2></div>
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
          <label htmlFor="topic">Topic</label>
          <select id="topic" value={topic} onChange={e => setTopic(e.target.value)}>
            <option value="">No topic</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {similar.length > 0 && (
          <div className="similar">
            <span className="eyebrow">Already asked</span>
            {similar.map(s => (
              <Link key={s.id} href={`/forum/${s.id}`}>
                {s.title}
                {s.topic && <span className="topictag">{s.topic}</span>}
              </Link>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="body">Detail</label>
          <textarea id="body" rows={5} value={body} onChange={e => setBody(e.target.value)} />
          <div className="hint">What you tried, what happened, what you cannot get past.</div>
        </div>
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <input id="tags" type="text" value={tags} placeholder="pricing, seed"
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
