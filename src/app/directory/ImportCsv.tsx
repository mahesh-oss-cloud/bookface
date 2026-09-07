'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COLUMNS = ['slug', 'name', 'batch', 'one_liner', 'industry', 'location', 'team_size', 'website', 'status', 'founders']

/** Names are typed by humans and matched against an imported list, so compare letters only. */
function key(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Minimal RFC-4180 parse: handles quoted fields and embedded commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim() !== ''))
}

export default function ImportCsv() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function run() {
    setBusy(true); setError(''); setDone('')

    const rows = parseCsv(text)
    if (rows.length < 2) {
      setError('Needs a header row and at least one company.')
      setBusy(false); return
    }

    const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    if (!header.includes('name')) {
      setError('The header row must include a "name" column.')
      setBusy(false); return
    }

    const records = rows.slice(1).map(r => {
      const rec: Record<string, string | number | string[] | null> = {}
      header.forEach((h, i) => {
        if (!COLUMNS.includes(h)) return
        const v = (r[i] ?? '').trim()
        if (h === 'team_size') rec[h] = v ? parseInt(v, 10) || null : null
        // Several founders share one cell. Semicolons and pipes both work, and
        // so does a comma once the cell is quoted the way CSV requires.
        else if (h === 'founders') rec[h] = v ? v.split(/\s*[;|,]\s*/).filter(Boolean) : []
        else rec[h] = v || null
      })
      return rec
    }).filter(r => r.name)

    if (records.length === 0) {
      setError('No rows had a company name.')
      setBusy(false); return
    }

    const supabase = createClient()

    // The directory already holds every company in the public listing, so a CSV is
    // almost always filling in fields on rows that exist — founders, most often.
    // Matching on slug first and name second is what stops that becoming 200
    // duplicate companies.
    const { data: existingRows, error: readError } = await supabase
      .from('directory_companies').select('id, slug, name')
    if (readError) { setError(readError.message); setBusy(false); return }

    const bySlug = new Map<string, string>()
    const byName = new Map<string, string[]>()
    for (const row of existingRows ?? []) {
      if (row.slug) bySlug.set(key(row.slug), row.id)
      const k = key(row.name)
      byName.set(k, [...(byName.get(k) ?? []), row.id])
    }

    const updates: Record<string, unknown>[] = []
    const inserts: Record<string, unknown>[] = []
    const ambiguous: string[] = []

    for (const rec of records) {
      const slugHit = rec.slug ? bySlug.get(key(String(rec.slug))) : undefined
      const nameHits = byName.get(key(String(rec.name))) ?? []
      if (slugHit) updates.push({ ...rec, id: slugHit })
      else if (nameHits.length === 1) updates.push({ ...rec, id: nameHits[0] })
      // Two companies share this name and the row carries no slug to tell them
      // apart. Guessing would write to the wrong company, so it is reported.
      else if (nameHits.length > 1) ambiguous.push(String(rec.name))
      else inserts.push(rec)
    }

    // Upserting on the primary key updates only the columns the CSV supplied;
    // everything else on the row is left alone.
    if (updates.length) {
      const { error: e } = await supabase.from('directory_companies').upsert(updates)
      if (e) { setError(e.message); setBusy(false); return }
    }
    if (inserts.length) {
      const { error: e } = await supabase.from('directory_companies').insert(inserts)
      if (e) { setError(e.message); setBusy(false); return }
    }

    setBusy(false)
    const parts = []
    if (updates.length) parts.push(`updated ${updates.length}`)
    if (inserts.length) parts.push(`added ${inserts.length}`)
    if (ambiguous.length) parts.push(`skipped ${ambiguous.length} with a duplicate name (${ambiguous.slice(0, 3).join(', ')}${ambiguous.length > 3 ? '…' : ''})`)
    setDone(parts.length ? `Done — ${parts.join(', ')}.` : 'Nothing to do.')
    setText('')
    router.refresh()
  }

  if (!open) {
    return <button className="btn btn-sm" onClick={() => setOpen(true)}>Import CSV</button>
  }

  return (
    <div className="block" style={{ marginTop: 12 }}>
      <div className="block-hd">
        <h2>Import companies</h2>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="pad">
        <div className="field">
          <label htmlFor="csv">Paste CSV</label>
          <textarea
            id="csv" rows={9} value={text} onChange={e => setText(e.target.value)}
            placeholder={'name,founders\nGroww,"Lalit Keshre; Harsh Jain"\n'}
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
          <div className="hint">
            First row is the header. Recognised columns: {COLUMNS.join(', ')}. Anything
            else is ignored, and only <code>name</code> is required. Put several
            founders in one <code>founders</code> cell separated by semicolons.
            <br />
            A company already in the directory is updated rather than added again,
            matched on <code>slug</code> if the CSV has one and on <code>name</code>
            otherwise, and only the columns you include are touched &mdash; so a
            two-column <code>name,founders</code> file just fills in founders.
          </div>
        </div>
        {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
        {done && <div className="notice notice-ok" style={{ marginBottom: 10 }}>{done}</div>}
        <button className="btn btn-p btn-sm" onClick={run} disabled={busy || !text.trim()}>
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  )
}
