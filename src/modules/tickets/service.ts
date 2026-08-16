import { createSystemClient } from '@/lib/supabase/system'
import {
  memAssign,
  memCountryIdFromCode,
  memCreate,
  memDemoTechnicians,
  memFindStoreByCodeInCountry,
  memFindStoreById,
  memGet,
  memListTickets,
  memUpdateStatus,
  supabaseReady,
  type MemTicket,
} from '@/lib/data/memory-store'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/modules/tickets/constants'
import { computeSlaTimestamps } from '@/modules/tickets/sla'
import { assertTransition, isTicketStatus } from '@/modules/tickets/transitions'
import type { TicketRow } from '@/modules/stores/data'

export { computeSlaTimestamps } from '@/modules/tickets/sla'

export type TicketSource =
  | 'whatsapp'
  | 'qr_whatsapp'
  | 'nfc_whatsapp'
  | 'web_fallback'
  | 'demo'

export type TicketRecord = {
  id: string
  organization_id: string
  country_id: string
  region_id: string
  store_id: string
  asset_id?: string | null
  number: number | null
  display_number: string | null
  category: string
  priority: TicketPriority
  status: TicketStatus
  title: string | null
  description: string
  source: TicketSource | string
  reporter_phone: string | null
  reporter_name: string | null
  language: string
  assigned_to: string | null
  sla_respond_by: string | null
  sla_resolve_by: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export type TicketMessage = {
  id: string
  ticket_id: string
  channel: string
  direction: string
  body: string | null
  media_url?: string | null
  created_at: string
}

export type TicketEvent = {
  id: string
  ticket_id: string
  event_type: string
  actor_id?: string | null
  payload: Record<string, unknown>
  created_at: string
}

export type TicketDetail = TicketRecord & {
  stores: {
    id: string
    code: string
    name: string
    city: string | null
    address: string | null
  } | null
  assignee: { id: string; full_name: string | null; email: string | null } | null
  messages: TicketMessage[]
  events: TicketEvent[]
  backend?: 'supabase' | 'memory'
}

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

export function formatDisplayNumber(n: number | null | undefined) {
  return n == null ? null : `OC-${n}`
}

function memToRecord(t: MemTicket): TicketRecord {
  return {
    id: t.id,
    organization_id: t.organization_id,
    country_id: t.country_id,
    region_id: t.region_id,
    store_id: t.store_id,
    asset_id: null,
    number: t.number,
    display_number: t.display_number,
    category: t.category,
    priority: t.priority as TicketPriority,
    status: t.status as TicketStatus,
    title: t.title,
    description: t.description,
    source: t.source,
    reporter_phone: t.reporter_phone,
    reporter_name: t.reporter_name,
    language: t.language,
    assigned_to: t.assigned_to,
    sla_respond_by: t.sla_respond_by,
    sla_resolve_by: t.sla_resolve_by,
    resolved_at: t.resolved_at,
    closed_at: t.closed_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }
}

export async function listTickets(limit = 100): Promise<{
  tickets: TicketRow[]
  backend: 'supabase' | 'memory'
}> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('tickets_service')
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
  return {
    tickets: memListTickets().slice(0, limit) as unknown as TicketRow[],
    backend: 'memory',
  }
}

export async function getById(id: string): Promise<TicketDetail | null> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('tickets_service')
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, stores ( id, code, name, city, address )')
      .eq('id', id)
      .maybeSingle()
    if (ticket) {
      const [messages, events, assigneeRes] = await Promise.all([
        supabase
          .from('ticket_messages')
          .select('id, ticket_id, channel, direction, body, media_url, created_at')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('ticket_events')
          .select('id, ticket_id, event_type, actor_id, payload, created_at')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true }),
        ticket.assigned_to
          ? supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', ticket.assigned_to)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])
      return {
        ...(ticket as unknown as TicketRecord & {
          stores: TicketDetail['stores']
        }),
        assignee: (assigneeRes.data as TicketDetail['assignee']) ?? null,
        messages: (messages.data ?? []) as TicketMessage[],
        events: (events.data ?? []) as TicketEvent[],
        backend: 'supabase',
      }
    }
  }
  const mem = memGet(id)
  if (!mem) return null
  return {
    ...memToRecord(mem as unknown as MemTicket),
    stores: mem.stores,
    assignee: mem.assignee,
    messages: mem.messages as TicketMessage[],
    events: mem.events as TicketEvent[],
    backend: 'memory',
  }
}

export async function createTicket(input: CreateTicketInput): Promise<TicketRecord> {
  const description = input.description?.trim()
  if (!description) throw new Error('תיאור התקלה נדרש')
  const priority = input.priority ?? 'medium'
  if (!TICKET_PRIORITIES.includes(priority)) throw new Error('עדיפות לא חוקית')
  const sla = computeSlaTimestamps(priority)

  if (await supabaseReady()) {
    const supabase = createSystemClient('tickets_service')
    const store = await resolveStore(supabase, input)
    assertStoreHierarchy(store)
    if (input.assetId) {
      await assertAssetBelongsToStore(supabase, input.assetId, store.id)
    }
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
    if (display_number) {
      await supabase.from('tickets').update({ display_number }).eq('id', data.id)
    }
    await supabase.from('ticket_events').insert({
      ticket_id: data.id,
      event_type: 'created',
      payload: { source: input.source ?? 'web_fallback' },
    })
    return { ...(data as TicketRecord), display_number }
  }

  if (!input.storeCode && !input.storeId) {
    throw new Error('יש לציין storeId או storeCode')
  }

  const store = resolveMemoryStore(input)
  assertStoreHierarchy(store)
  return memToRecord(
    memCreate({
      store,
      description,
      priority,
      category: input.category,
      source: input.source,
      reporterPhone: input.reporterPhone,
      reporterName: input.reporterName,
      title: input.title,
      language: input.language,
      ...sla,
    }),
  )
}

/** Service-layer hierarchy checks (DB triggers mirror these in Supabase). */
export function assertStoreHierarchy(store: {
  id: string
  organization_id?: string | null
  country_id?: string | null
  region_id?: string | null
}) {
  if (!store.country_id || !store.region_id) {
    throw new Error('Store is missing country/region hierarchy')
  }
  if (!store.organization_id) {
    throw new Error('Store is missing organization hierarchy')
  }
}

export function resolveMemoryStore(input: CreateTicketInput) {
  if (input.storeId) {
    const byId = memFindStoreById(input.storeId)
    if (!byId) throw new Error('חנות לא נמצאה')
    if (input.countryCode) {
      const expected = memCountryIdFromCode(input.countryCode)
      if (expected && byId.country_id !== expected) {
        throw new Error('Store does not belong to the requested country')
      }
    }
    return byId
  }

  if (!input.storeCode) {
    throw new Error('יש לציין storeId או storeCode')
  }

  const countryId =
    memCountryIdFromCode(input.countryCode) ??
    (input.countryCode ? null : memCountryIdFromCode('IL'))
  if (input.countryCode && !countryId) {
    throw new Error(`מדינה לא נתמכת: ${input.countryCode}`)
  }
  const byCountry = memFindStoreByCodeInCountry(
    countryId ?? memCountryIdFromCode('IL')!,
    input.storeCode,
  )
  if (!byCountry) {
    throw new Error(`חנות לא נמצאה: ${input.storeCode}`)
  }
  return byCountry
}

async function assertAssetBelongsToStore(
  supabase: ReturnType<typeof createSystemClient>,
  assetId: string,
  storeId: string,
) {
  const { data, error } = await supabase
    .from('assets')
    .select('id, store_id')
    .eq('id', assetId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Asset not found')
  if (data.store_id !== storeId) {
    throw new Error('Asset does not belong to the selected store')
  }
}

export async function updateStatus(
  id: string,
  nextStatus: string,
  actorId?: string | null,
): Promise<TicketRecord> {
  if (!isTicketStatus(nextStatus)) throw new Error(`סטטוס לא חוקי: ${nextStatus}`)

  if (await supabaseReady()) {
    const current = await getById(id)
    if (!current) throw new Error('תקלה לא נמצאה')
    const from = current.status as TicketStatus
    assertTransition(from, nextStatus)
    const supabase = createSystemClient('tickets_service')
    const patch: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'resolved') patch.resolved_at = new Date().toISOString()
    if (nextStatus === 'closed') patch.closed_at = new Date().toISOString()
    if (nextStatus === 'in_progress' && from === 'resolved') {
      patch.resolved_at = null
    }
    const { data, error } = await supabase
      .from('tickets')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    await appendEvent(id, 'status_changed', actorId ?? null, {
      from,
      to: nextStatus,
    })
    return data as TicketRecord
  }

  const current = memGet(id)
  if (!current) throw new Error('תקלה לא נמצאה')
  assertTransition(current.status as TicketStatus, nextStatus)
  return memToRecord(memUpdateStatus(id, nextStatus, null, actorId))
}

export async function assign(
  id: string,
  assignedTo: string,
  actorId?: string | null,
): Promise<TicketRecord> {
  if (!assignedTo?.trim()) throw new Error('מזהה טכנאי נדרש')

  if (await supabaseReady()) {
    const current = await getById(id)
    if (!current) throw new Error('תקלה לא נמצאה')
    const from = current.status as TicketStatus
    const patch: Record<string, unknown> = { assigned_to: assignedTo.trim() }
    let statusChanged = false
    if (from === 'new' || from === 'triaged') {
      assertTransition(from, 'assigned')
      patch.status = 'assigned'
      statusChanged = true
    }
    const supabase = createSystemClient('tickets_service')
    const { data, error } = await supabase
      .from('tickets')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    await appendEvent(id, 'assigned', actorId ?? null, {
      assigned_to: assignedTo.trim(),
      previous: current.assigned_to,
    })
    if (statusChanged) {
      await appendEvent(id, 'status_changed', actorId ?? null, {
        from,
        to: 'assigned',
      })
    }
    return data as TicketRecord
  }

  const current = memGet(id)
  if (!current) throw new Error('תקלה לא נמצאה')
  const from = current.status as TicketStatus
  if (from === 'new' || from === 'triaged') {
    assertTransition(from, 'assigned')
  }
  return memToRecord(memAssign(id, assignedTo.trim(), actorId))
}

/** Alias used by some callers */
export const assignTicket = assign
export const updateTicketStatus = updateStatus

export async function appendEvent(
  ticketId: string,
  eventType: string,
  actorId: string | null = null,
  payload: Record<string, unknown> = {},
): Promise<TicketEvent> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('tickets_service')
    const { data, error } = await supabase
      .from('ticket_events')
      .insert({
        ticket_id: ticketId,
        event_type: eventType,
        actor_id: actorId,
        payload,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as TicketEvent
  }
  const { memAddEvent } = await import('@/lib/data/memory-store')
  return memAddEvent(ticketId, eventType, payload, actorId) as TicketEvent
}

export async function listInternalTechnicians(): Promise<
  { id: string; full_name: string | null; email: string | null }[]
> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('tickets_service')
    const { data, error } = await supabase
      .from('memberships')
      .select('profile_id, profiles ( id, full_name, email )')
      .eq('role', 'internal_technician')

    if (error) return memDemoTechnicians()

    const seen = new Set<string>()
    const result: { id: string; full_name: string | null; email: string | null }[] =
      []
    for (const row of data ?? []) {
      const profile = row.profiles as
        | { id: string; full_name: string | null; email: string | null }
        | { id: string; full_name: string | null; email: string | null }[]
        | null
      const p = Array.isArray(profile) ? profile[0] : profile
      if (!p?.id || seen.has(p.id)) continue
      seen.add(p.id)
      result.push(p)
    }
    return result.length ? result : memDemoTechnicians()
  }
  return memDemoTechnicians()
}

type StoreResolved = {
  id: string
  organization_id: string
  country_id: string
  region_id: string
}

async function resolveStore(
  supabase: ReturnType<typeof createSystemClient>,
  input: CreateTicketInput,
): Promise<StoreResolved> {
  if (input.storeId) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, organization_id, country_id, region_id')
      .eq('id', input.storeId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('חנות לא נמצאה')
    return data as StoreResolved
  }

  if (!input.storeCode) {
    throw new Error('יש לציין storeId או storeCode')
  }

  let query = supabase
    .from('stores')
    .select('id, organization_id, country_id, region_id, countries!inner(code)')
    .eq('code', input.storeCode)
    .eq('is_active', true)

  if (input.countryCode) {
    query = query.eq('countries.code', input.countryCode)
  } else {
    query = query.eq('countries.code', 'IL')
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error(`חנות עם קוד ${input.storeCode} לא נמצאה`)
  return {
    id: data.id,
    organization_id: data.organization_id,
    country_id: data.country_id,
    region_id: data.region_id,
  }
}

export { TICKET_STATUSES }
