'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/lib/types'

/**
 * The company describes itself. Any of its founders can edit; the partner
 * cannot, and that is enforced by RLS rather than by this component being
 * hidden — hiding it is only so nobody is offered a button that would fail.
 */
export default function EditProfile({ company }: { company: Company }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [oneLiner, setOneLiner] = useState(company.one_liner ?? '')
  const [description, setDescription] = useState(company.description ?? '')
  const [website, setWebsite] = useState(company.website ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true); setError(''); setSaved(false)
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('companies')
      .update({
        one_liner: oneLiner.trim() || null,
        description: description.trim() || null,
        website: website.trim() || null,
      })
      .eq('id', company.id)

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setSaved(true)
    router.refresh()
  }

  if (!open) {
    return (
      <div className="block">
        <div className="block-hd">
          <h2>Your profile</h2>
          <button className="btn btn-sm" onClick={() => setOpen(true)}>Edit</button>
        </div>
        <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>
            This is what the partner and the rest of the batch read before they
            meet you. Keep the one-liner to the sentence you would actually say.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="block">
      <div className="block-hd">
        <h2>Edit profile</h2>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="pad">
        <div className="field">
          <label htmlFor="oneLiner">One-liner</label>
          <input id="oneLiner" value={oneLiner} onChange={e => setOneLiner(e.target.value)} />
          <div className="hint">One sentence. What it is and who it is for.</div>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={8} value={description}
            onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="website">Website</label>
          <input id="website" value={website} placeholder="https://"
            onChange={e => setWebsite(e.target.value)} />
        </div>
        {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
        {saved && <div className="notice notice-ok" style={{ marginBottom: 10 }}>Saved.</div>}
        <button className="btn btn-p btn-sm" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
