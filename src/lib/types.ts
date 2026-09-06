export interface Profile {
  id: string
  full_name: string
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
