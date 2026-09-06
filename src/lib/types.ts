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
