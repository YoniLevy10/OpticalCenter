import { createAdminClient } from '@/lib/supabase/admin'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

export type StoreRow = {
  id: string
  code: string
  name: string
  city: string | null
  address: string | null
  region_id: string
  is_active?: boolean
}

export type TicketRow = {
  id: string
  number: number | null
  display_number: string | null
  status: string
  priority: string
  category: string
  description: string
  source: string
  created_at: string
  store_id: string
  organization_id?: string
  country_id?: string
  region_id?: string
  assigned_to?: string | null
  title?: string | null
  updated_at?: string
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  stores?: {
    code: string
    name: string
    city: string | null
    address?: string | null
  } | null
}

/** Fallback when DB is unavailable — 48 real Optical Center IL branches. */
export const DEMO_STORES: StoreRow[] = israelStoresAsRows()

export async function fetchStores(opts?: {
  includeInactive?: boolean
}): Promise<{ stores: StoreRow[]; fromDb: boolean }> {
  const { supabaseReady, memListStores } = await import('@/lib/data/memory-store')
  if (!(await supabaseReady())) {
    return {
      stores: memListStores({
        activeOnly: !opts?.includeInactive,
      }).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        city: s.city,
        address: s.address,
        region_id: s.region_id,
        is_active: s.is_active,
      })),
      fromDb: false,
    }
  }

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('stores')
      .select('id, code, name, city, address, region_id, is_active')
      .order('code')
    if (!opts?.includeInactive) {
      query = query.eq('is_active', true)
    }
    const { data, error } = await query
    if (error || !data?.length) {
      return { stores: DEMO_STORES, fromDb: false }
    }
    return { stores: data as StoreRow[], fromDb: true }
  } catch {
    return { stores: DEMO_STORES, fromDb: false }
  }
}

export async function fetchTickets(): Promise<{ tickets: TicketRow[]; fromDb: boolean }> {
  try {
    const { listTickets } = await import('@/modules/tickets/service')
    const { tickets, backend } = await listTickets()
    return { tickets, fromDb: backend === 'supabase' }
  } catch {
    return { tickets: [], fromDb: false }
  }
}
