'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { defaultAlive } from '@/lib/batch'
import type { CompanyFinances } from '@/lib/types'

export default function RunwayForm({
  companyId, existing, readOnly,
}: {
  companyId: string | null
  existing: CompanyFinances | null
  readOnly: boolean
}) {
  const router = useRouter()
  const [cash, setCash] = useState(existing?.cash_on_hand?.toString() ?? '')
  const [burn, setBurn] = useState(existing?.monthly_burn?.toString() ?? '')
  const [revenue, setRevenue] = useState(existing?.monthly_revenue?.toString() ?? '')
  const [growth, setGrowth] = useState(existing?.growth_rate_pct?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0 }
  const filled = cash !== '' && burn !== ''
  const result = filled ? defaultAlive(n(cash), n(burn), n(revenue), n(growth)) : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setBusy(true); setError(''); setSaved(false)

    const supabase = createClient()
    const { error: dbError } = await supabase.from('company_finances').upsert({
      company_id: companyId,
      cash_on_hand: n(cash),
      monthly_burn: n(burn),
      monthly_revenue: n(revenue),
      growth_rate_pct: n(growth),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }
    setSaved(true)
    router.refresh()
  }

  return (
    <>
      <div className="block">
        <div className="block-hd">
          <h2>Default alive?</h2>
          <span className="aside">
            {existing ? `Updated ${new Date(existing.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Not filled in'}
          </span>
        </div>

        {result ? (
          <div className="pad">
            <div className="stat">
              <span className="big" style={{ color: result.alive ? 'var(--good)' : 'var(--crit)' }}>
                {result.alive ? 'Alive' : 'Dead'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, maxWidth: '52ch' }}>
              {result.verdict}
            </div>
            {!result.alive && result.runwayMonths !== null && result.runwayMonths <= 6 && (
              <div className="notice notice-err" style={{ marginTop: 10 }}>
                Under six months. This is the number to walk into office hours with.
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            <strong>Nothing to calculate yet</strong>
            <p>Cash on hand and monthly burn are the two the answer cannot be worked out without.</p>
          </div>
        )}
      </div>

      <div className="block">
        <div className="block-hd"><h2>{readOnly ? 'Their numbers' : 'Your numbers'}</h2></div>
        <form onSubmit={save} className="pad">
          <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label htmlFor="cash">Cash on hand</label>
                <input id="cash" type="number" step="1" min="0" value={cash} onChange={e => setCash(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="burn">Monthly burn</label>
                <input id="burn" type="number" step="1" min="0" value={burn} onChange={e => setBurn(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="rev">Monthly revenue</label>
                <input id="rev" type="number" step="1" min="0" value={revenue} onChange={e => setRevenue(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="growth">Revenue growth (% per month)</label>
                <input id="growth" type="number" step="0.1" value={growth} onChange={e => setGrowth(e.target.value)} />
              </div>
            </div>

            {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
            {saved && <div className="notice notice-ok" style={{ marginBottom: 10 }}>Saved.</div>}

            {!readOnly && (
              <button className="btn btn-p btn-sm" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            )}
          </fieldset>
          {readOnly && (
            <div style={{ fontSize: 11, color: 'var(--meta)' }}>
              Founders keep these current. You are reading them.
            </div>
          )}
        </form>
      </div>
    </>
  )
}
