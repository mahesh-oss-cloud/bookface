'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Composer({
  recipientId,
  recipientFounderId,
  recipientName,
}: {
  /** Set for someone with an account. */
  recipientId?: string
  /** Set instead for a directory founder — saved, never delivered. */
  recipientFounderId?: string
  recipientName: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    const text = body.trim()
    if (!text) return
    setBusy(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session has expired. Sign in again.'); setBusy(false); return }

    // Exactly one recipient column is set; the database rejects anything else.
    const { error: dbError } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: recipientId ?? null,
      recipient_founder_id: recipientFounderId ?? null,
      body: text,
    })

    setBusy(false)
    // The message is only cleared once the database has taken it. A failed
    // send leaves what you typed in the box instead of swallowing it.
    if (dbError) { setError(dbError.message); return }
    setBody('')
    router.refresh()
  }

  return (
    <div className="composer">
      {error && <div className="notice notice-err" style={{ marginBottom: 8 }}>{error}</div>}
      <textarea
        rows={3}
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
        }}
        placeholder={recipientFounderId
          ? `Note about ${recipientName.split(' ')[0]} — saved to your account only`
          : `Message ${recipientName.split(' ')[0]}`}
        maxLength={4000}
      />
      <div className="composer-foot">
        <span className="hint">
          {recipientFounderId ? 'Saved to your account — not delivered' : '⌘/Ctrl + Enter sends'}
        </span>
        <button className="btn btn-p btn-sm" onClick={send} disabled={busy || !body.trim()}>
          {busy ? 'Saving…' : recipientFounderId ? 'Save note' : 'Send'}
        </button>
      </div>
    </div>
  )
}
