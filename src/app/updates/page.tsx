import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import UpdateForm from './UpdateForm'
import type { Profile, WeeklyUpdate } from '@/lib/types'
import { type Batch, weekNumber, formatMetric, percentChange, formatDate } from '@/lib/batch'

export const dynamic = 'force-dynamic'

export default async function UpdatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileRow } = await supabase
    .from('profiles').select('id, full_name, bookface_id, role, title, company_id').eq('id', user.id).single()
  const profile = profileRow as Profile | null

  // Partners don't file updates; sending them here would be a dead end.
  if (profile?.role === 'partner') redirect('/')
  if (!profile?.company_id) redirect('/')

  const { data: batchRow } = await supabase.from('batches').select('*').eq('id', 'W26').single()
  const batch = batchRow as Batch | null

  const raw = batch ? weekNumber(batch) : 1
  const week = batch ? Math.min(Math.max(raw, 1), batch.total_weeks) : 1

  const { data: rows } = await supabase
    .from('weekly_updates').select('*').order('week_number', { ascending: true })
  const updates = (rows ?? []) as WeeklyUpdate[]

  const thisWeek = updates.find(u => u.week_number === week) ?? null
  const lastFiled = updates.length ? updates[updates.length - 1] : null

  // Rolling window, matching how these updates are normally read.
  const windowStart = Math.max(1, week - 7)
  const series = updates.filter(u => u.week_number >= windowStart)
  const max = series.length ? Math.max(...series.map(u => Number(u.metric_value))) : 0

  return (
    <>
      <Chrome current="/updates" />
      <div className="wrap cols">
        <div>
          <div className="block">
            <div className="block-hd">
              <h2>{thisWeek ? `Amend week ${week}` : `File week ${week}`}</h2>
              <span className="aside">
                {thisWeek ? `Filed ${formatDate(thisWeek.submitted_at)}` : 'Not filed yet'}
              </span>
            </div>
            <UpdateForm
              companyId={profile.company_id}
              week={week}
              existing={thisWeek}
              lastMetricName={lastFiled?.metric_name ?? null}
            />
          </div>
        </div>

        <aside>
          <div className="block">
            <div className="block-hd">
              <h2>Last 8 weeks</h2>
              <span className="aside">{series.length} filed</span>
            </div>

            {series.length === 0 ? (
              <div className="empty">
                <strong>Nothing filed yet</strong>
                <p>The chart builds itself from what you file, one week at a time.</p>
              </div>
            ) : (
              <div className="pad">
                <svg viewBox="0 0 244 84" width="100%" height="84" role="img"
                     aria-label={`${series[0].metric_name} by week`}>
                  <line x1="0" y1="66" x2="244" y2="66" stroke="#e2e0dc" strokeWidth="1" />
                  {series.map((u, i) => {
                    const w = Math.min(26, 244 / Math.max(series.length, 1) - 4)
                    const x = i * (w + 4) + 2
                    const h = max > 0 ? Math.max(2, (Number(u.metric_value) / max) * 54) : 2
                    const isLast = i === series.length - 1
                    return (
                      <g key={u.id}>
                        <rect x={x} y={66 - h} width={w} height={h} fill={isLast ? '#ff6600' : '#f6b98c'} />
                        <text x={x + w / 2} y={78} fill="#767676" fontSize="8"
                              fontFamily="Verdana, sans-serif" textAnchor="middle">
                          {u.week_number}
                        </text>
                      </g>
                    )
                  })}
                </svg>
                <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 4 }}>
                  {series[series.length - 1].metric_name} · peak{' '}
                  {formatMetric(max, series[series.length - 1].metric_unit)}
                </div>
              </div>
            )}
          </div>

          {updates.length > 0 && (
            <div className="block">
              <div className="block-hd"><h2>History</h2></div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr><th className="num">Wk</th><th>Metric</th><th className="num">Value</th><th className="num">Δ</th></tr>
                  </thead>
                  <tbody>
                    {[...updates].reverse().map((u, i, arr) => {
                      const prev = arr[i + 1]
                      const d = prev ? percentChange(Number(u.metric_value), Number(prev.metric_value)) : null
                      return (
                        <tr key={u.id}>
                          <td className="num">{u.week_number}</td>
                          <td>{u.metric_name}</td>
                          <td className="num">{formatMetric(Number(u.metric_value), u.metric_unit)}</td>
                          <td className="num">
                            {d === null ? <span className="dim">—</span> : (
                              <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`}>
                                {d > 0 ? '+' : ''}{d.toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
