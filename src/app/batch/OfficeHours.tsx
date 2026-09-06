'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/lib/types'
import { formatDateTime } from '@/lib/batch'

interface Row {
  id: string
  company_id: string | null
  kind: 'partner' | 'group'
  starts_at: string
  status: 'open' | 'booked' | 'done' | 'cancelled'
  founder_note: string | null
  partner_note: string | null
}

export default function OfficeHours({
  rows, companies, role, myCompanyId,
}: {
  rows: Row[]
  companies: Company[]
  role: 'founder' | 'partner'
  myCompanyId: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [when, setWhen] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  const isPartner = role === 'partner'
  const companyName = (id: string | null) =>
    companies.find(c => c.id === id)?.name ?? 'Whole batch'

  async function request(e: React.FormEvent) {
    e.preventDefault()
    if (!when) { setError('Pick a date and time.'); return }
    setBusy(true); setError('')

    const { error: dbError } = await supabase.from('office_hours').insert({
      company_id: isPartner ? null : myCompanyId,
      kind: isPartner ? 'group' : 'partner',
      starts_at: new Date(when).toISOString(),
      status: isPartner ? 'open' : 'booked',
      founder_note: isPartner ? null : (note.trim() || null),
    })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setWhen(''); setNote('')
    router.refresh()
  }

  async function saveNote(id: string) {
    setBusy(true)
    const field = isPartner ? 'partner_note' : 'founder_note'
    const { error: dbError } = await supabase
      .from('office_hours')
      .update({ [field]: noteDraft.trim() || null })
      .eq('id', id)
    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setOpenNote(null); setNoteDraft('')
    router.refresh()
  }

  async function setStatus(id: string, status: Row['status']) {
    setBusy(true)
    await supabase.from('office_hours').update({ status }).eq('id', id)
    setBusy(false)
    router.refresh()
  }

  return (
    <div>
      <div className="block">
        <div className="block-hd">
          <h2>Office hours</h2>
          <span className="aside">{rows.length} scheduled</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <strong>Nothing booked</strong>
            <p>
              {isPartner
                ? 'Open a group slot below and the founders in your group will see it.'
                : 'Request a slot with your group partner below.'}
            </p>
          </div>
        ) : rows.map(r => (
          <div key={r.id} style={{ padding: '9px 12px', borderBottom: '1px solid var(--rule-soft)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12 }}>
                  {formatDateTime(r.starts_at)}
                  <span className="tag" style={{ marginLeft: 6 }}>{r.kind === 'group' ? 'group' : '1:1'}</span>
                  {r.status === 'done' && <span className="tag" style={{ marginLeft: 4 }}>done</span>}
                  {r.status === 'cancelled' && <span className="tag" style={{ marginLeft: 4 }}>cancelled</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 1 }}>
                  {companyName(r.company_id)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flex: 'none' }}>
                <button className="btn btn-sm" disabled={busy}
                  onClick={() => {
                    setOpenNote(openNote === r.id ? null : r.id)
                    setNoteDraft((isPartner ? r.partner_note : r.founder_note) ?? '')
                  }}>
                  {isPartner ? 'Partner note' : 'Add note'}
                </button>
                {r.status !== 'done' && (
                  <button className="btn btn-sm" disabled={busy} onClick={() => setStatus(r.id, 'done')}>
                    Mark done
                  </button>
                )}
              </div>
            </div>

            {r.founder_note && (
              <div style={{ fontSize: 11, marginTop: 6, color: 'var(--ink-2)' }}>
                <span className="eyebrow">Founder</span>
                <div style={{ marginTop: 2 }}>{r.founder_note}</div>
              </div>
            )}
            {r.partner_note && (
              <div style={{ fontSize: 11, marginTop: 6, color: 'var(--ink-2)' }}>
                <span className="eyebrow">Partner</span>
                <div style={{ marginTop: 2 }}>{r.partner_note}</div>
              </div>
            )}

            {openNote === r.id && (
              <div style={{ marginTop: 8 }}>
                <textarea rows={3} value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                  placeholder={isPartner ? 'What you agreed, and what they should do next.' : 'What you want to use the time on.'} />
                <button className="btn btn-p btn-sm" style={{ marginTop: 6 }}
                  disabled={busy} onClick={() => saveNote(r.id)}>
                  Save note
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="block">
        <div className="block-hd">
          <h2>{isPartner ? 'Open a group slot' : 'Request office hours'}</h2>
        </div>
        <form onSubmit={request} className="pad">
          <div className="field">
            <label htmlFor="when">When</label>
            <input id="when" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
          </div>
          {!isPartner && (
            <div className="field">
              <label htmlFor="agenda">What you want to talk about</label>
              <textarea id="agenda" rows={2} value={note} onChange={e => setNote(e.target.value)} />
            </div>
          )}
          {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-p btn-sm" type="submit" disabled={busy}>
            {busy ? 'Saving…' : isPartner ? 'Open slot' : 'Request slot'}
          </button>
        </form>
      </div>
    </div>
  )
}
