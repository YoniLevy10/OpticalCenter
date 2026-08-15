import { createAdminClient } from '@/lib/supabase/admin'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@/modules/tickets/constants'
import { assertTransition, isTicketStatus } from '@/modules/tickets/transitions'

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
  asset_id: string | null
  number: number | null
  display_number: string | null
  category: string
  priority: TicketPriority
  status: TicketStatus
  title: string | null
  description: string
  source: TicketSource
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
  media_url: string | null
  created_at: string
}

export type TicketEvent = {
  id: string
  ticket_id: string
  event_type: string
  actor_id: string | null
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

/** Simple SLA windows (hours) by priority — Phase 1 placeholder. */
const SLA_HOURS: Record<
  TicketPriority,
  { respond: number; resolve: number }
> = {
  critical: { respond: 1, resolve: 4 },
  high: { respond: 2, resolve: 8 },
  medium: { respond: 4, resolve: 24 },
  low: { respond: 8, resolve: 72 },
}

function addHours(from: Date, hours: number): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString()
}

export function computeSlaTimestamps(
  priority: TicketPriority,
  now = new Date(),
): { sla_respond_by: string; sla_resolve_by: string } {
  const window = SLA_HOURS[priority]
  return {
    sla_respond_by: addHours(now, window.respond),
    sla_resolve_by: addHours(now, window.resolve),
  }
}

export function formatDisplayNumber(number: number | null | undefined): string | null {
  if (number == null) return null
  return `OC-${number}`
}

function admin() {
  return createAdminClient()
}

export async function listTickets(limit = 100): Promise<TicketRecord[]> {
  const supabase = admin()
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as TicketRecord[]
}

export async function getById(id: string): Promise<TicketDetail | null> {
  const supabase = admin()
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      stores ( id, code, name, city, address )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!ticket) return null

  const [messagesRes, eventsRes, assigneeRes] = await Promise.all([
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

  if (messagesRes.error) throw new Error(messagesRes.error.message)
  if (eventsRes.error) throw new Error(eventsRes.error.message)

  return {
    ...(ticket as unknown as TicketRecord & {
      stores: TicketDetail['stores']
    }),
    assignee: (assigneeRes.data as TicketDetail['assignee']) ?? null,
    messages: (messagesRes.data ?? []) as TicketMessage[],
    events: (eventsRes.data ?? []) as TicketEvent[],
  }
}

export async function createTicket(input: CreateTicketInput): Promise<TicketRecord> {
  const description = input.description?.trim()
  if (!description) throw new Error('תיאור התקלה נדרש')

  const priority = input.priority ?? 'medium'
  if (!TICKET_PRIORITIES.includes(priority)) {
    throw new Error('עדיפות לא חוקית')
  }

  const supabase = admin()
  const store = await resolveStore(supabase, input)
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
      status: 'new' satisfies TicketStatus,
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

  if (error) throw new Error(error.message)

  const ticket = data as TicketRecord
  const display_number = formatDisplayNumber(ticket.number)

  if (display_number && ticket.display_number !== display_number) {
    const { data: updated, error: updateError } = await supabase
      .from('tickets')
      .update({ display_number })
      .eq('id', ticket.id)
      .select('*')
      .single()
    if (updateError) throw new Error(updateError.message)
    Object.assign(ticket, updated)
  }

  await appendEvent(ticket.id, 'created', null, {
    status: ticket.status,
    priority: ticket.priority,
    source: ticket.source,
  })

  return { ...ticket, display_number: ticket.display_number ?? display_number }
}

export async function updateStatus(
  id: string,
  nextStatus: string,
  actorId?: string | null,
): Promise<TicketRecord> {
  if (!isTicketStatus(nextStatus)) {
    throw new Error(`סטטוס לא חוקי: ${nextStatus}`)
  }

  const supabase = admin()
  const { data: current, error: fetchError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!current) throw new Error('תקלה לא נמצאה')

  const from = current.status as TicketStatus
  assertTransition(from, nextStatus)

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

export async function assign(
  id: string,
  profileId: string,
  actorId?: string | null,
): Promise<TicketRecord> {
  if (!profileId?.trim()) throw new Error('מזהה טכנאי נדרש')

  const supabase = admin()
  const { data: current, error: fetchError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!current) throw new Error('תקלה לא נמצאה')

  const patch: Record<string, unknown> = { assigned_to: profileId.trim() }
  let statusChanged = false
  const from = current.status as TicketStatus

  if (from === 'new' || from === 'triaged') {
    assertTransition(from, 'assigned')
    patch.status = 'assigned'
    statusChanged = true
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await appendEvent(id, 'assigned', actorId ?? null, {
    assigned_to: profileId.trim(),
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

export async function appendEvent(
  ticketId: string,
  eventType: string,
  actorId: string | null = null,
  payload: Record<string, unknown> = {},
): Promise<TicketEvent> {
  const supabase = admin()
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

export async function listInternalTechnicians(): Promise<
  { id: string; full_name: string | null; email: string | null }[]
> {
  const supabase = admin()
  const { data, error } = await supabase
    .from('memberships')
    .select('profile_id, profiles ( id, full_name, email )')
    .eq('role', 'internal_technician')

  if (error) {
    return []
  }

  const seen = new Set<string>()
  const result: { id: string; full_name: string | null; email: string | null }[] = []
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
  return result
}

type StoreResolved = {
  id: string
  organization_id: string
  country_id: string
  region_id: string
}

async function resolveStore(
  supabase: ReturnType<typeof createAdminClient>,
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
