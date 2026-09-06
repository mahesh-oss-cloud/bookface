import { createClient } from '@/lib/supabase/server'
import Chrome from '@/components/Chrome'
import RunwayForm from './RunwayForm'
import type { Profile, CompanyFinances } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RunwayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileRow } = await supabase
    .from('profiles').select('id, full_name, role, title, company_id').eq('id', user.id).single()
  const profile = profileRow as Profile | null
  const isPartner = profile?.role === 'partner'

  const { data: finRow } = await supabase.from('company_finances').select('*').maybeSingle()
  const finances = (finRow ?? null) as CompanyFinances | null

  return (
    <>
      <Chrome current="/runway" />
      <div className="wrap cols">
        <div>
          <RunwayForm
            companyId={profile?.company_id ?? null}
            existing={finances}
            readOnly={isPartner}
          />
        </div>
        <aside>
          <div className="block">
            <div className="block-hd"><h2>What this asks</h2></div>
            <div className="pad" style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                On your current cash, burn and growth rate, do you reach profitability
                before the money runs out? If yes you are default alive, and every
                decision after that is yours to make. If no, you are raising whether you
                planned to or not.
              </p>
              <p style={{ margin: 0 }}>
                The projection walks forward a month at a time, growing revenue and
                subtracting burn, and reports whichever comes first &mdash; the crossover
                or zero.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
