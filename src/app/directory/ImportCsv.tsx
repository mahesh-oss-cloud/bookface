'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COLUMNS = ['name', 'batch', 'one_liner', 'industry', 'location', 'team_size', 'website', 'status', 'founders']

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
    const { error: dbError } = await supabase.from('directory_companies').insert(records)

    setBusy(false)
    if (dbError) { setError(dbError.message); return }

    setDone(`Imported ${records.length} ${records.length === 1 ? 'company' : 'companies'}.`)
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
            placeholder={'name,batch,one_liner,industry,location,team_size,website,status,founders\n'}
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
          <div className="hint">
            First row is the header. Recognised columns: {COLUMNS.join(', ')}. Anything
            else is ignored, and only <code>name</code> is required. Put several
            founders in one <code>founders</code> cell separated by semicolons.
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
