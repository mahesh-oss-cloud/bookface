export interface Profile {
  id: string
  full_name: string
  bookface_id: string | null
  role: 'founder' | 'partner'
  title: string | null
  company_id: string | null
}

export interface Company {
  id: string
  name: string
  batch_id: string | null
  one_liner: string | null
  website: string | null
  logo_url: string | null
  description: string | null
  sector: string | null
  location: string | null
  founded_year: number | null
  product_url: string | null
  brand_color: string | null
}

export type FactSection = 'product' | 'integration' | 'pricing' | 'stack' | 'compliance'

export interface CompanyFact {
  id: string
  company_id: string
  section: FactSection
  label: string
  detail: string | null
  sort_order: number
}

export interface WeeklyUpdate {
  id: string
  company_id: string
  week_number: number
  metric_name: string
  metric_value: number
  metric_unit: string
  shipped: string | null
  learned: string | null
  blocked: string | null
  submitted_at: string
}

export interface BatchEvent {
  id: string
  title: string
  kind: 'event' | 'dinner' | 'workshop' | 'deadline' | 'demoday'
  starts_at: string
  detail: string | null
  /** False while the stored date is still a placeholder. Render TBC, not the date. */
  date_confirmed: boolean
}

export interface DirectoryCompany {
  id: string
  name: string
  batch: string | null
  one_liner: string | null
  industry: string | null
  location: string | null
  team_size: number | null
  website: string | null
  status: string | null
  slug: string | null
  logo_url: string | null
  yc_url: string | null
  description: string | null
  batch_name: string | null
  batch_sort: number | null
  subindustry: string | null
  stage: string | null
  tags: string[]
  regions: string[]
  top_company: boolean
  /** Founder names as published by the accelerator. Public business information,
      not personal data — the same names that appear on a public company page. */
  founders: string[]
}

export interface DirectoryFounder {
  id: string
  company_id: string
  name: string
  title: string | null
  linkedin_url: string | null
  sort_order: number
  /** Set once this founder holds an account, which is what makes a message to
      them land in a real inbox rather than waiting for one. */
  profile_id: string | null
}

export interface BatchFacet { batch: string; batch_name: string | null; batch_sort: number | null; companies: number }
export interface NameFacet { industry?: string; region?: string; companies: number }

export interface Message {
  id: string
  sender_id: string
  /** Null when the message is addressed to a directory founder with no account. */
  recipient_id: string | null
  recipient_founder_id: string | null
  body: string
  created_at: string
  read_at: string | null
}

export interface Post {
  id: string
  author_id: string
  kind: 'ask' | 'share' | 'announcement'
  title: string
  body: string | null
  tags: string[]
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at: string
}

export interface CompanyFinances {
  company_id: string
  cash_on_hand: number | null
  monthly_burn: number | null
  monthly_revenue: number | null
  growth_rate_pct: number | null
  currency: string
  updated_at: string
}
