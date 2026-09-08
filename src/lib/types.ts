export interface Profile {
  id: string
  full_name: string
  bookface_id: string | null
  role: 'founder' | 'partner'
  title: string | null
  company_id: string | null
  avatar_url: string | null
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
  /** Null until someone supplies a real photo; the UI falls back to initials
      rather than standing in a face that is not theirs. */
  avatar_url: string | null
}

export interface Resource {
  id: string
  category: string
  title: string
  provider: string | null
  url: string
  description: string | null
  /** The one number or fact worth seeing without clicking through. */
  detail: string | null
  cost: 'Free' | 'Free tier' | 'Discounted' | 'Paid' | null
  region: string
  tags: string[]
  sort_order: number
}

export interface BatchFacet { batch: string; batch_name: string | null; batch_sort: number | null; companies: number }
export interface NameFacet { industry?: string; region?: string; companies: number }

export interface Message {
  id: string
  sender_id: string
  /** Null when the message is addressed to a directory entry with no account. */
  recipient_id: string | null
  /** The person in the directory it was written to, account or not. */
  recipient_person_id: string | null
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
  topic: string | null
  /** The reply the asker says actually solved it. */
  accepted_comment_id: string | null
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

export type PersonKind = 'founder' | 'investor' | 'partner'

/** One of the companies a person is listed on, denormalised onto their row. */
export interface PersonCompany {
  id: string
  name: string
  batch: string | null
  logo_url: string | null
  title: string | null
}

/**
 * A person in the network, whichever door they came in through: named on a
 * company's public listing, a partner, or an investor with a public tie to the
 * accelerator. One row per person, not per company they founded.
 */
export interface Person {
  id: string
  person_key: string
  name: string
  kind: PersonKind
  /** Set for partners and investors: what they are known for in their own right. */
  known_for: string | null
  org: string | null
  role_title: string | null
  linkedin_url: string | null
  avatar_url: string | null
  /** Set once this person holds an account here, so a message reaches an inbox
      directly rather than waiting against their directory entry. */
  profile_id: string | null
  /** 'directory' — read off a company listing. 'public' — compiled from public record. */
  source: 'directory' | 'public'
  source_url: string | null
  batches: string[]
  companies: PersonCompany[]
  /** Read off what their companies do. A fact about the companies, not a claim. */
  works_on: string[]
  /** Declared by the person themselves. Only they can write it. */
  expertise: string[]
}

export interface TagFacet { tag: string; people: number }
export interface KindFacet { kind: PersonKind; people: number }
export interface PeopleBatchFacet { batch: string; people: number }
