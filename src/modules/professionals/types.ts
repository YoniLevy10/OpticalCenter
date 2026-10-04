export type Professional = {
  id: string
  organization_id?: string | null
  full_name: string
  phone: string | null
  trade: string | null
  midrag_sector_id: number | null
  midrag_service_id: number | null
  company_name: string | null
  notes: string | null
  source: 'manual' | 'midrag' | 'vendor'
  is_active: boolean
  use_count: number
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export type ProfessionalInput = {
  full_name: string
  phone?: string | null
  trade?: string | null
  midrag_sector_id?: number | null
  midrag_service_id?: number | null
  company_name?: string | null
  notes?: string | null
  source?: Professional['source']
}
