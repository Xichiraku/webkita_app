export interface PricingPlan {
  plan_title: string
  price_min: number
  price_max: number
  price_range: string
  features: string[]
}

export interface Project {
  id: number
  user_id: number
  plan_title: string
  price_range: string
  project_title: string
  category: string
  description: string
  skills: string
  contact_name: string
  contact_phone: string
  additional_notes: string
  status: ProjectStatus
  plan_price_range: string | null
  reject_reason: string | null
  invoice_number: string | null
  invoice_issued_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProjectStatus =
  | 'pending'
  | 'process'
  | 'approved'
  | 'rejected'
  | 'done'

export type ProjectCategory =
  | 'website'
  | 'mobile'
  | 'desktop'
  | 'design'
  | 'marketing'
  | 'other'

export interface CreateProjectRequest {
  plan_title: string
  price_range?: string
  project_title: string
  category: ProjectCategory
  description: string
  skills: string
  contact_name: string
  contact_phone: string
  additional_notes?: string
}

export interface UpdateProjectStatusRequest {
  status: ProjectStatus
  /** Alasan penolakan (hanya dipakai bila status = rejected) */
  reason?: string
}