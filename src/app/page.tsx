import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import type { Profile, Company, WeeklyUpdate, BatchEvent } from '@/lib/types'
import {
  type Batch, weekNumber, batchPhase, weekLabel,
  formatDateTime, formatMetric, percentChange,
} from '@/lib/batch'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, batchRes, eventsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, title, company_id').eq('id', user.id).single(),
    supabase.from('batches').select('*').eq('id', 'W26').single(),
    supabase.from('batch_events').select('*').order('starts_at'),
  ])

  const profile = profileRes.data as Profile | null
  const batch = batchRes.data as Batch | null
  const events = (eventsRes.data ?? []) as BatchEvent[]

  const week = batch ? weekNumber(batch) : 0
  const finished = batch ? week > batch.total_weeks : false
  const currentWeek = batch ? Math.min(Math.max(week, 1), batch.total_weeks) : 1
  const isPartner = profile?.role === 'partner'

  // Founders see their own company's updates; the partner sees everyone's.
  // RLS enforces this — the query below is simply what each role is allowed.
  const { data: updateRows } = await supabase
    .from('weekly_updates')
    .select('*')
    .order('week_number', { ascending: false })

  const updates = (updateRows ?? []) as WeeklyUpdate[]

  const { data: companyRows } = await supabase.from('companies').select('*')
  const companies = (companyRows ?? []) as Company[]
  const myCompany = companies.find(c => c.id === profile?.company_id) ?? null

  const latest = updates[0] ?? null
  const previous = updates[1] ?? null
  const change = latest && previous
    ? percentChange(Number(latest.metric_value), Number(previous.metric_value))
    : null

  const upcoming = events.filter(e => new Date(e.starts_at) >= new Date()).slice(0, 5)
  const shown = upcoming.length > 0 ? upcoming : events.slice(-5)

  return (
    <>
      <Chrome current="/" />
      <div className="wrap cols">
        <div>
          {/* ── batch position ─────────────────────────────── */}
          <div className="block">
            <div className="block-hd">
              <h2>{batch?.name ?? 'Batch'}</h2>
              <span className="aside">
                {finished
                  ? `Programme complete — Demo Day was ${new Date(batch!.demo_day_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `Week ${currentWeek} of ${batch?.total_weeks ?? 12} · ${batchPhase(currentWeek)}`}
              </span>
            </div>
            <div className="pad">
              <div className="strip">
                {Array.from({ length: batch?.total_weeks ?? 12 }, (_, i) => i + 1).map(w => (
                  <div
                    key={w}
                    className={`wk ${finished || w < currentWeek ? 'done' : ''} ${!finished && w === currentWeek ? 'now' : ''}`}
                  >
                    <div className="n">{String(w).padStart(2, '0')}</div>
                    <div className="l">{weekLabel(w)}</div>
                  </div>
                ))}
              </div>
              <div className="phases">
                <span>Find what people want</span>
                <span>Build &amp; grow</span>
                <span>Prepare the pitch</span>
                <span>Raise</span>
              </div>
            </div>
          </div>

          {/* ── the metric ─────────────────────────────────── */}
          {isPartner ? (
            <div className="block">
              <div className="block-hd">
                <h2>Your group</h2>
                <span className="aside">{companies.length} {companies.length === 1 ? 'company' : 'companies'}</span>
              </div>
              {companies.length === 0 ? (
                <div className="empty">
                  <strong>No companies yet</strong>
                  <p>Companies appear here once they are added to the batch.</p>
                </div>
              ) : (
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Company</th><th>What they do</th><th>Latest metric</th>
                        <th className="num">Week</th><th>Blocked on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(c => {
                        const u = updates.find(x => x.company_id === c.id)
                        return (
                          <tr key={c.id}>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>{c.name}</td>
                            <td>{c.one_liner ?? <span className="dim">—</span>}</td>
                            <td>
                              {u
                                ? <><span className="num">{formatMetric(Number(u.metric_value), u.metric_unit)}</span> <span className="dim">{u.metric_name}</span></>
                                : <span className="dim">Nothing filed yet</span>}
                            </td>
                            <td className="num">{u ? u.week_number : '—'}</td>
                            <td>{u?.blocked ? u.blocked : <span className="dim">—</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="pad" style={{ borderTop: '1px solid var(--rule)' }}>
                <span className="dim" style={{ fontSize: 11 }}>
                  Partners read these going into office hours. Only founders can file or
                  amend a number, so what you see is what they reported.
                </span>
              </div>
            </div>
          ) : (
            <div className="block">
              <div className="block-hd">
                <h2>{myCompany?.name ?? 'Your company'}</h2>
                <span className="aside">{updates.length} {updates.length === 1 ? 'week filed' : 'weeks filed'}</span>
              </div>

              {latest ? (
                <div className="pad">
                  <div className="stat">
                    <span className="big">{formatMetric(Number(latest.metric_value), latest.metric_unit)}</span>
                    {change !== null && (
                      <span className={`delta ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}% w/w
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 2 }}>
                    {latest.metric_name} · week {latest.week_number}
                  </div>
                  {latest.blocked && (
                    <div className="notice notice-info" style={{ marginTop: 10 }}>
                      <strong>Blocked:</strong> {latest.blocked}
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <Link href="/updates" className="btn btn-p btn-sm">File week {currentWeek}</Link>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  <strong>No weekly update filed yet</strong>
                  <p>
                    Pick the one number that defines whether you are growing, and file it
                    every week. The chart is only worth anything if it is unbroken — that
                    is the whole point of the exercise.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <Link href="/updates" className="btn btn-p btn-sm">File your first update</Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── rail ─────────────────────────────────────────── */}
        <aside>
          <div className="block">
            <div className="block-hd"><h2>Coming up</h2></div>
            {shown.length === 0 ? (
              <div className="empty"><p>Nothing scheduled.</p></div>
            ) : shown.map(e => (
              <div className="row" key={e.id}>
                <span className="when">{new Date(e.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span className="what">
                  {e.title}
                  {e.kind === 'deadline' && <span className="tag" style={{ marginLeft: 5 }}>due</span>}
                  {e.detail && <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 2 }}>{e.detail}</div>}
                </span>
              </div>
            ))}
          </div>

          <div className="block">
            <div className="block-hd"><h2>Signed in as</h2></div>
            <div className="pad" style={{ fontSize: 12 }}>
              <div style={{ fontWeight: 'bold' }}>{profile?.full_name}</div>
              <div className="dim">{profile?.title}</div>
              {myCompany && <div className="dim" style={{ marginTop: 4 }}>{myCompany.name} <span className="batchtag">W26</span></div>}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
