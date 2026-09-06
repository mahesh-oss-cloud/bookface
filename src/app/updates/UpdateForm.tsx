'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyUpdate } from '@/lib/types'

const UNITS = [
  { value: 'USD', label: 'Dollars' },
  { value: 'INR', label: 'Rupees' },
  { value: 'customers', label: 'Paying customers' },
  { value: 'users', label: 'Weekly active users' },
  { value: 'orders', label: 'Orders' },
]

export default function UpdateForm({
  companyId, week, existing, lastMetricName,
}: {
  companyId: string
  week: number
  existing: WeeklyUpdate | null
  lastMetricName: string | null
}) {
  const router = useRouter()

  const [metricName, setMetricName] = useState(existing?.metric_name ?? lastMetricName ?? '')
  const [metricValue, setMetricValue] = useState(existing ? String(existing.metric_value) : '')
  const [metricUnit, setMetricUnit] = useState(existing?.metric_unit ?? 'USD')
  const [shipped, setShipped] = useState(existing?.shipped ?? '')
  const [learned, setLearned] = useState(existing?.learned ?? '')
  const [blocked, setBlocked] = useState(existing?.blocked ?? '')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)

    const value = parseFloat(metricValue)
    if (!metricName.trim()) { setError('Name the metric you are tracking.'); setBusy(false); return }
    if (!Number.isFinite(value)) { setError('Enter this week’s number.'); setBusy(false); return }

    const supabase = createClient()
    // Upsert on (company_id, week_number): filing twice amends the week rather
    // than creating a second, competing row for it.
    const { error: dbError } = await supabase
      .from('weekly_updates')
      .upsert({
        company_id: companyId,
        week_number: week,
        metric_name: metricName.trim(),
        metric_value: value,
        metric_unit: metricUnit,
        shipped: shipped.trim() || null,
        learned: learned.trim() || null,
        blocked: blocked.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,week_number' })

    setBusy(false)
    if (dbError) { setError(dbError.message); return }

    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit}>
      <div className="pad">
        <div className="field">
          <label htmlFor="metric">The one metric</label>
          <input
            id="metric" type="text" value={metricName} placeholder="Net revenue"
            onChange={e => setMetricName(e.target.value)}
          />
          <div className="hint">
            Pick the single number that tells you whether you are growing, and keep
            reporting the same one. Changing it every week is how a chart stops meaning
            anything.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10 }}>
          <div className="field">
            <label htmlFor="value">This week&rsquo;s number</label>
            <input
              id="value" type="number" step="0.01" min="0" value={metricValue}
              onChange={e => setMetricValue(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="unit">Measured in</label>
            <select id="unit" value={metricUnit} onChange={e => setMetricUnit(e.target.value)}>
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="shipped">What shipped</label>
          <textarea id="shipped" rows={3} value={shipped} onChange={e => setShipped(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="learned">What you learned</label>
          <textarea id="learned" rows={3} value={learned} onChange={e => setLearned(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="blocked">What is blocking you</label>
          <textarea id="blocked" rows={2} value={blocked} onChange={e => setBlocked(e.target.value)} />
          <div className="hint">Your group partner reads this before office hours.</div>
        </div>

        {error && <div className="notice notice-err" style={{ marginBottom: 10 }}>{error}</div>}
        {saved && <div className="notice notice-ok" style={{ marginBottom: 10 }}>Week {week} filed.</div>}

        <button className="btn btn-p" type="submit" disabled={busy}>
          {busy ? 'Filing…' : existing ? `Amend week ${week}` : `File week ${week}`}
        </button>
      </div>
    </form>
  )
}
