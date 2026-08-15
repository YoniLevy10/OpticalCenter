import { createAdminClient } from '@/lib/supabase/admin'
import {
  memAssign,
  memCreate,
  memGet,
  memListTickets,
  memStore,
  memUpdateStatus,
  supabaseReady,
} from '@/lib/data/memory-store'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { TICKET_PRIORITIES } from '@/modules/tickets/constants'
import { assertTransition, isTicketStatus } from '@/modules/tickets/transitions'
import type { TicketRow } from '@/modules/stores/data'

export type TicketSource =
  | 'whatsapp'
  | 'qr_whatsapp'
  | 'nfc_whatsapp'
  | 'web_fallback'
  | 'demo'

export type CreateTicketInput = {
  storeId?: string
  storeCode?: string
  countryCode?: string
  description: string
  title?: string
  category?: string
  priority?: TicketPriority
  source?: TicketSource
  reporterPhone?: string
  reporterName?: string
  language?: string
  assetId?: string
}

const SLA_HOURS: Record<TicketPriority, { respond: number; resolve: number }> = {
  critical: { respond: 1, resolve: 4 },
  high: { respond: 2, resolve: 8 },
  medium: { respond: 4, resolve: 24 },
  low: { respond: 8, resolve: 72 },
}

function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * 3600_000).toISOString()
}

export function computeSlaTimestamps(priority: TicketPriority, now = new Date()) {
  const w = SLA_HOURS[priority]
  return {
    sla_respond_by: addHours(now, w.respond),
    sla_resolve_by: addHours(now, w.resolve),
  }
}

export function formatDisplayNumber(n: number | null | undefined) {
  return n == null ? null : `OC-${n}`
}

export async function listTickets(limit = 100): Promise<{
  tickets: TicketRow[]
  backend: 'supabase' | 'memory'
}> {
  if (await supabaseReady()) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, number, display_number, status, priority, category, description, source, created_at, store_id, assigned_to, stores(code, name, city)',
      )
      .order('created_at', { ascending: false })
      .limit(limit)
    if (!error && data) {
      return { tickets: data as unknown as TicketRow[], backend: 'supabase' }
    }
  }
  return { tickets: memListTickets(), backend: 'memory' }
}

export async function getById(id: string) {
  if (await supabaseReady()) {
    const supabase = createAdminClient()
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, stores ( id, code, name, city, address )')
      .eq('id', id)
      .maybeSingle()
    if (ticket) {
      const [messages, events] = await Promise.all([
        supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('ticket_events')
          .select('*')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true }),
      ])
      return {
        ...ticket,
        messages: messages.data ?? [],
        events: events.data ?? [],
        backend: 'supabase' as const,
      }
    }
  }
  const mem = memGet(id)
  if (!mem) return null
  return { ...mem, backend: 'memory' as const }
}

export async function createTicket(input: CreateTicketInput) {
  const description = input.description?.trim()
  if (!description) throw new Error('תיאור התקלה נדרש')
  const priority = input.priority ?? 'medium'
  if (!TICKET_PRIORITIES.includes(priority)) throw new Error('עדיפות לא חוקית')

  if (await supabaseReady()) {
    const supabase = createAdminClient()
    let storeQuery = supabase
      .from('stores')
      .select('id, code, name, city, organization_id, country_id, region_id')
    if (input.storeId) storeQuery = storeQuery.eq('id', input.storeId)
    else if (input.storeCode) storeQuery = storeQuery.eq('code', input.storeCode)
    else throw new Error('יש לציין storeId או storeCode')
    const { data: store, error: storeErr } = await storeQuery.maybeSingle()
    if (storeErr || !store) throw new Error('חנות לא נמצאה')
    const sla = computeSlaTimestamps(priority)
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        organization_id: store.organization_id,
        country_id: store.country_id,
        region_id: store.region_id,
        store_id: store.id,
        asset_id: input.assetId ?? null,
        category: input.category ?? 'other',
        priority,
        status: 'new',
        title: input.title?.trim() || null,
        description,
        source: input.source ?? 'web_fallback',
        reporter_phone: input.reporterPhone ?? null,
        reporter_name: input.reporterName ?? null,
        language: input.language ?? 'he',
        ...sla,
      })
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'יצירה נכשלה')
    const display_number = formatDisplayNumber(data.number)
    await supabase.from('tickets').update({ display_number }).eq('id', data.id)
    await supabase.from('ticket_events').insert({
      ticket_id: data.id,
      event_type: 'created',
      payload: { source: input.source ?? 'web_fallback' },
    })
    return { ...data, display_number }
  }

  const code = input.storeCode
  if (!code) throw new Error('storeCode נדרש במצב דמו')
  const store = memStore(code)
  if (!store) throw new Error(`חנות לא נמצאה: ${code}`)
  return memCreate({
    store,
    description,
    priority,
    category: input.category,
    source: input.source,
    reporterPhone: input.reporterPhone,
    title: input.title,
  })
}

export async function updateStatus(id: string, nextStatus: string, note?: string) {
  if (!isTicketStatus(nextStatus)) throw new Error('סטטוס לא חוקי')
  if (await supabaseReady()) {
    const current = await getById(id)
    if (!current) throw new Error('תקלה לא נמצאה')
    const from = current.status as TicketStatus
    assertTransition(from, nextStatus)
    const supabase = createAdminClient()
    const patch: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'resolved') patch.resolved_at = new Date().toISOString()
    if (nextStatus === 'closed') patch.closed_at = new Date().toISOString()
    const { error } = await supabase.from('tickets').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    await supabase.from('ticket_events').insert({
      ticket_id: id,
      event_type: 'status_changed',
      payload: { from, to: nextStatus, note: note ?? null },
    })
    return getById(id)
  }
  memUpdateStatus(id, nextStatus, note)
  return getById(id)
}

export async function assignTicket(id: string, assigneeId: string) {
  if (await supabaseReady()) {
    const current = await getById(id)
    if (!current) throw new Error('תקלה לא נמצאה')
    const from = current.status as TicketStatus
    const next = from === 'new' || from === 'triaged' ? 'assigned' : from
    if (next !== from) assertTransition(from, next)
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: assigneeId, status: next })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await supabase.from('ticket_events').insert({
      ticket_id: id,
      event_type: 'assigned',
      payload: { assigneeId },
    })
    return getById(id)
  }
  memAssign(id, assigneeId)
  return getById(id)
}

/** Alias used by some routes */
export const updateTicketStatus = updateStatus
