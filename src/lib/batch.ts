export interface Batch {
  id: string
  name: string
  starts_on: string
  demo_day_on: string
  total_weeks: number
}

const DAY = 86_400_000

/**
 * Which week of the programme a date falls in. Returns 0 before kickoff and a
 * number past total_weeks once the batch has finished — callers decide how to
 * present those, rather than this quietly clamping and lying about the date.
 */
export function weekNumber(batch: Batch, when: Date = new Date()): number {
  const start = new Date(`${batch.starts_on}T00:00:00Z`).getTime()
  const diff = when.getTime() - start
  if (diff < 0) return 0
  return Math.floor(diff / (7 * DAY)) + 1
}

export function batchPhase(week: number): string {
  if (week <= 3) return 'Find what people want'
  if (week <= 8) return 'Build & grow'
  if (week <= 10) return 'Prepare the pitch'
  return 'Raise'
}

/** Label for each of the twelve weeks, used by the schedule strip. */
export function weekLabel(week: number): string {
  if (week === 1) return 'Kickoff'
  if (week <= 3) return 'Talk to users'
  if (week <= 5) return 'Build'
  if (week <= 8) return 'Grow'
  if (week === 9) return 'DD prep'
  if (week === 10) return 'Rehearsals'
  if (week === 11) return 'Demo Day'
  return 'Fundraise'
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - from.getTime()) / DAY)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Metric formatting that respects the unit the founder chose. */
export function formatMetric(value: number, unit: string): string {
  if (unit === 'USD') return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (unit === 'INR') return '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ' + unit
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
