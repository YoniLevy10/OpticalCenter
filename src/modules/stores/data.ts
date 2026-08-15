import { createAdminClient } from '@/lib/supabase/admin'

export type StoreRow = {
  id: string
  code: string
  name: string
  city: string | null
  address: string | null
  region_id: string
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
  assigned_to?: string | null
  title?: string | null
  updated_at?: string
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  stores?: {
    code: string
    name: string
    city: string | null
    address?: string | null
  } | null
}

/** Fallback seed when DB migrations not applied yet — mirrors Israel demo stores. */
export const DEMO_STORES: StoreRow[] = [
  { id: 'demo-172', code: '172', name: 'תל אביב אבן גבירול', city: 'תל אביב', address: 'אבן גבירול', region_id: 'ta' },
  { id: 'demo-101', code: '101', name: 'תל אביב שינקין', city: 'תל אביב', address: 'שינקין', region_id: 'ta' },
  { id: 'demo-102', code: '102', name: 'בני ברק', city: 'בני ברק', address: 'רבי עקיבא 128', region_id: 'ta' },
  { id: 'demo-104', code: '104', name: 'בת ים פארק הים', city: 'בת ים', address: 'הקוממיות 16', region_id: 'ctr' },
  { id: 'demo-105', code: '105', name: 'ראשון לציון', city: 'ראשון לציון', address: 'שדרות יוסף לישנסקי 9', region_id: 'ctr' },
  { id: 'demo-106', code: '106', name: 'חולון', city: 'חולון', address: 'הפלד 7', region_id: 'ctr' },
  { id: 'demo-109', code: '109', name: 'ירושלים כיכר ציון', city: 'ירושלים', address: null, region_id: 'jlm' },
  { id: 'demo-111', code: '111', name: 'חיפה הרצל', city: 'חיפה', address: null, region_id: 'hfa' },
  { id: 'demo-113', code: '113', name: 'יקנעם G Mall', city: 'יקנעם', address: 'התמר 2', region_id: 'n' },
  { id: 'demo-115', code: '115', name: 'באר שבע מול', city: 'באר שבע', address: null, region_id: 's' },
]

export async function fetchStores(): Promise<{ stores: StoreRow[]; fromDb: boolean }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('stores')
      .select('id, code, name, city, address, region_id')
      .eq('is_active', true)
      .order('code')
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
