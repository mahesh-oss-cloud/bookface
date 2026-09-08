'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * "Ask me about" is the one thing on a person's row that they write themselves,
 * so it is the one thing the page lets them edit. The write goes through
 * set_my_expertise(), which picks its target from auth.uid() — there is no row
 * id in the call for anyone to swap.
 */
export default function Expertise({
  initial,
  suggestions,
}: {
  initial: string[]
  suggestions: string[]
}) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(initial)
  // What is actually stored, so Save goes quiet again once it matches.
  const [base, setBase] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const dirty = tags.join(' ') !== base.join(' ')

  function add(raw: string) {
    const next = raw.split(',').map(t => t.trim()).filter(Boolean)
    if (next.length === 0) return
    setTags(prev => Array.from(new Set([...prev, ...next])).slice(0, 12))
    setDraft('')
    setSaved(false)
  }

  function remove(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
    setSaved(false)
  }

  async function save() {
    setBusy(true); setError('')
    const { data, error: rpcError } = await createClient().rpc('set_my_expertise', { tags })
    setBusy(false)
    if (rpcError) { setError(rpcError.message); return }
    // The function normalises and caps what it stores, so the page shows back
    // what was actually written rather than what was typed.
    setTags((data ?? []) as string[])
    setBase((data ?? []) as string[])
    setSaved(true)
    router.refresh()
  }

  const unused = suggestions.filter(s => !tags.includes(s)).slice(0, 8)

  return (
    <div className="pad">
      <div className="chips">
        {tags.length === 0 && (
          <span className="dim" style={{ fontSize: 12 }}>
            Nothing yet. Add what people should come to you with.
          </span>
        )}
        {tags.map(t => (
          <button className="chip chip-x" type="button" key={t} onClick={() => remove(t)}
                  aria-label={`Remove ${t}`}>
            {t}<span aria-hidden="true">&times;</span>
          </button>
        ))}
      </div>

      <form
        style={{ display: 'flex', gap: 6, marginTop: 10 }}
        onSubmit={e => { e.preventDefault(); add(draft) }}
      >
        <input
          type="text" value={draft} placeholder="Pricing, RLS, hiring engineer #1"
          onChange={e => setDraft(e.target.value)} style={{ flex: 1 }}
        />
        <button className="btn btn-sm" type="submit" disabled={!draft.trim()}>Add</button>
      </form>

      {unused.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          <span className="eyebrow" style={{ alignSelf: 'center' }}>Common</span>
          {unused.map(s => (
            <button className="chip chip-add" type="button" key={s} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="notice notice-err" style={{ marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <button className="btn btn-p btn-sm" type="button" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && !dirty && <span className="dim" style={{ fontSize: 11 }}>Saved.</span>}
      </div>
    </div>
  )
}
