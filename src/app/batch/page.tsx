import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import OfficeHours from './OfficeHours'
import type { Profile, BatchEvent, Company } from '@/lib/types'
import { type Batch, weekNumber, weekLabel, batchPhase, formatDateTime, batchTiming } from '@/lib/batch'

export const dynamic = 'force-dynamic'

interface OfficeHourRow {
  id: string
  company_id: string | null
  kind: 'partner' | 'group'
  starts_at: string
  status: 'open' | 'booked' | 'done' | 'cancelled'
  founder_note: string | null
  partner_note: string | null
}

export default async function BatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, batchRes, eventsRes, ohRes, coRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, bookface_id, role, title, company_id, avatar_url').eq('id', user.id).single(),
    supabase.from('batches').select('*').eq('id', 'W26').single(),
    supabase.from('batch_events').select('*').order('starts_at'),
    supabase.from('office_hours').select('*').order('starts_at'),
    supabase.from('companies').select('*'),
  ])

  const profile = profileRes.data as Profile | null
  const batch = batchRes.data as Batch | null
  const events = (eventsRes.data ?? []) as BatchEvent[]
  const hours = (ohRes.data ?? []) as OfficeHourRow[]
  const companies = (coRes.data ?? []) as Company[]

  const raw = batch ? weekNumber(batch) : 0
  const pending = batch ? !batch.dates_confirmed : true
  const finished = batch ? !pending && raw > batch.total_weeks : false
  const current = batch ? Math.min(Math.max(raw, 1), batch.total_weeks) : 1

  return (
    <>
      <Chrome current="/batch" />
      <div className="wrap">
        <div className="block">
          <div className="block-hd">
            <h2>{batch?.name} — Batch HQ</h2>
            <span className="aside">
              {batch && batchTiming(batch)}
              {' · '}{companies.length} {companies.length === 1 ? 'company' : 'companies'}
            </span>
          </div>
          <div className="pad">
            <div className="strip">
              {Array.from({ length: batch?.total_weeks ?? 12 }, (_, i) => i + 1).map(w => (
                <div key={w} className={`wk ${!pending && (finished || w < current) ? 'done' : ''} ${!pending && !finished && w === current ? 'now' : ''}`}>
                  <div className="n">{String(w).padStart(2, '0')}</div>
                  <div className="l">{weekLabel(w)}</div>
                </div>
              ))}
            </div>
            <div className="phases">
              <span>Find what people want</span><span>Build &amp; grow</span>
              <span>Prepare the pitch</span><span>Raise</span>
            </div>
            {finished && (
              <div className="notice notice-info" style={{ marginTop: 12 }}>
                The twelve weeks are complete. Weekly updates stay open — the founders who
                keep filing after Demo Day are the ones who still have the chart a year later.
              </div>
            )}
            {pending && (
              <div className="notice notice-info" style={{ marginTop: 12 }}>
                The batch runs {batch?.window_label ?? 'over twelve weeks'} and Demo Day is fixed.
                The start date is still being confirmed, so no week is marked current yet.
              </div>
            )}
            {!pending && !finished && (
              <div style={{ fontSize: 11, color: 'var(--meta)', marginTop: 10 }}>
                Week {current} · {batchPhase(current)}
              </div>
            )}
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <OfficeHours
            rows={hours}
            companies={companies}
            role={profile?.role ?? 'founder'}
            myCompanyId={profile?.company_id ?? null}
          />

          <div>
            <div className="block">
              <div className="block-hd"><h2>Schedule</h2><span className="aside">{events.length} entries</span></div>
              {events.length === 0 ? (
                <div className="empty"><p>Nothing scheduled yet.</p></div>
              ) : events.map(e => (
                <div className="row" key={e.id}>
                  <span className="when">
                    {e.date_confirmed
                      ? new Date(e.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : <span style={{ color: 'var(--meta)' }}>TBC</span>}
                  </span>
                  <span className="what">
                    <span style={{ fontWeight: e.kind === 'demoday' ? 'bold' : 'normal' }}>{e.title}</span>
                    {e.kind === 'deadline' && <span className="tag" style={{ marginLeft: 5 }}>due</span>}
                    {e.kind === 'demoday' && <span className="batchtag" style={{ marginLeft: 5 }}>demo day</span>}
                    {e.detail && <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 2 }}>{e.detail}</div>}
                  </span>
                </div>
              ))}
            </div>

            <div className="block">
              <div className="block-hd"><h2>Companies in the batch</h2></div>
              {companies.length === 0 ? (
                <div className="empty"><p>No companies yet.</p></div>
              ) : companies.map(c => (
                <div className="row" key={c.id}>
                  <span className="what">
                    <strong>{c.name}</strong>
                    {c.one_liner && <div style={{ color: 'var(--meta)', fontSize: 11, marginTop: 2 }}>{c.one_liner}</div>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
