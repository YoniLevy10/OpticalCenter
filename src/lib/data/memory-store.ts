import { DEMO_STORES, type StoreRow } from '@/modules/stores/data'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'

export type MemTicket = {
  id: string
  organization_id: string
  country_id: string
  region_id: string
  store_id: string
  number: number | null
  display_number: string | null
  category: string
  priority: string
  status: string
  title: string | null
  description: string
  source: string
  reporter_phone: string | null
  reporter_name: string | null
  language: string
  assigned_to: string | null
  sla_respond_by: string | null
  sla_resolve_by: string | null
  resolved_at: string | null
  closed_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
  stores: {
    id: string
    code: string
    name: string
    city: string | null
    address: string | null
  } | null
  assignee: { id: string; full_name: string | null; email: string | null } | null
  messages: {
    id: string
    ticket_id: string
    channel: string
    direction: string
    body: string | null
    media_url?: string | null
    created_at: string
  }[]
  events: {
    id: string
    ticket_id: string
    event_type: string
    actor_id?: string | null
    payload: Record<string, unknown>
    created_at: string
  }[]
}

export const DEMO_TECH_ID = '11111111-1111-4111-8111-111111111111'

const DEMO_TECHS = [
  {
    id: DEMO_TECH_ID,
    full_name: 'יוסי כהן',
    email: 'yossi.cohen@optical-center.demo',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    full_name: 'מיכל לוי',
    email: 'michal.levy@optical-center.demo',
  },
] as const

export const MEM_ORG_ID = '11111111-1111-1111-1111-111111111111'
export const MEM_COUNTRY_ID = '22222222-2222-2222-2222-222222222222'

export type MemSession = {
  wa_id: string
  country_id: string
  store_id: string | null
  store_code: string | null
  state: 'awaiting_store' | 'awaiting_description' | 'done'
  pending_description: string | null
  expires_at: string
  updated_at: string
}

type GlobalMem = {
  tickets: Map<string, MemTicket>
  sessions: Map<string, MemSession>
  processed: Set<string>
  seq: number
}

function store(): GlobalMem {
  const g = globalThis as typeof globalThis & { __maintainosMem?: GlobalMem }
  if (!g.__maintainosMem) {
    g.__maintainosMem = {
      tickets: new Map(),
      sessions: new Map(),
      processed: new Set(),
      seq: 18000,
    }
  }
  // Backfill fields if an older in-process shape exists
  const mem = g.__maintainosMem
  if (!mem.sessions) mem.sessions = new Map()
  if (!mem.processed) mem.processed = new Set()
  return mem
}

export async function supabaseReady(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false
  // Prefer memory when explicitly requested (local demo without migrations).
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return false
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const { error } = await supabase.from('stores').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export function memDemoTechnicians() {
  return DEMO_TECHS.map((t) => ({ ...t }))
}

export function memStore(code: string): StoreRow | undefined {
  return DEMO_STORES.find((s) => s.code === code)
}

export function memListTickets(): MemTicket[] {
  return [...store().tickets.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function memGet(id: string): MemTicket | undefined {
  return store().tickets.get(id)
}

export function memCreate(input: {
  store: StoreRow | { id: string; code: string; name: string; city: string | null; address?: string | null; region_id?: string }
  description: string
  priority: TicketPriority | string
  category?: string
  source?: string
  reporterPhone?: string
  reporterName?: string
  title?: string
  language?: string
  sla_respond_by?: string
  sla_resolve_by?: string
  status?: TicketStatus | string
  assigned_to?: string | null
}): MemTicket {
  const mem = store()
  mem.seq += 1
  const number = mem.seq
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const ticket: MemTicket = {
    id,
    organization_id: MEM_ORG_ID,
    country_id: MEM_COUNTRY_ID,
    region_id: ('region_id' in input.store && input.store.region_id) || 'ta',
    store_id: input.store.id,
    number,
    display_number: `OC-${number}`,
    category: input.category ?? 'other',
    priority: input.priority,
    status: input.status ?? 'new',
    title: input.title?.trim() || null,
    description: input.description,
    source: input.source ?? 'demo',
    reporter_phone: input.reporterPhone ?? null,
    reporter_name: input.reporterName ?? null,
    language: input.language ?? 'he',
    assigned_to: input.assigned_to ?? null,
    sla_respond_by: input.sla_respond_by ?? null,
    sla_resolve_by: input.sla_resolve_by ?? null,
    resolved_at: null,
    closed_at: null,
    resolution_note: null,
    created_at: now,
    updated_at: now,
    stores: {
      id: input.store.id,
      code: input.store.code,
      name: input.store.name,
      city: input.store.city,
      address: ('address' in input.store ? input.store.address : null) ?? null,
    },
    assignee: null,
    messages: [],
    events: [
      {
        id: `${id}-ev-created`,
        ticket_id: id,
        event_type: 'created',
        actor_id: null,
        payload: { source: input.source ?? 'demo' },
        created_at: now,
      },
    ],
  }

  if (ticket.assigned_to) {
    const tech = DEMO_TECHS.find((t) => t.id === ticket.assigned_to)
    ticket.assignee = tech
      ? { id: tech.id, full_name: tech.full_name, email: tech.email }
      : { id: ticket.assigned_to, full_name: null, email: null }
  }

  mem.tickets.set(id, ticket)
  return ticket
}

export function memUpdateStatus(
  id: string,
  nextStatus: string,
  resolutionNote: string | null = null,
  actorId: string | null = null,
): MemTicket {
  const ticket = store().tickets.get(id)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const from = ticket.status
  ticket.status = nextStatus
  ticket.updated_at = new Date().toISOString()
  if (nextStatus === 'resolved') {
    ticket.resolved_at = ticket.updated_at
    if (resolutionNote?.trim()) ticket.resolution_note = resolutionNote.trim()
  }
  if (nextStatus === 'closed') ticket.closed_at = ticket.updated_at
  if (nextStatus === 'in_progress' && from === 'resolved') {
    ticket.resolved_at = null
  }
  ticket.events.push({
    id: `${id}-ev-${ticket.events.length + 1}`,
    ticket_id: id,
    event_type: 'status_changed',
    actor_id: actorId,
    payload: {
      from,
      to: nextStatus,
      ...(resolutionNote?.trim() ? { resolution_note: resolutionNote.trim() } : {}),
    },
    created_at: ticket.updated_at,
  })
  if (resolutionNote?.trim() && nextStatus === 'resolved') {
    ticket.messages.push({
      id: `${id}-msg-${ticket.messages.length + 1}`,
      ticket_id: id,
      channel: 'tech',
      direction: 'system',
      body: `פתרון: ${resolutionNote.trim()}`,
      created_at: ticket.updated_at,
    })
  }
  return ticket
}

export function memAssign(
  id: string,
  assignedTo: string,
  actorId: string | null = null,
): MemTicket {
  const ticket = store().tickets.get(id)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const previous = ticket.assigned_to
  const from = ticket.status
  ticket.assigned_to = assignedTo
  ticket.updated_at = new Date().toISOString()
  const tech = DEMO_TECHS.find((t) => t.id === assignedTo)
  ticket.assignee = tech
    ? { id: tech.id, full_name: tech.full_name, email: tech.email }
    : { id: assignedTo, full_name: null, email: null }

  if (from === 'new' || from === 'triaged') {
    ticket.status = 'assigned'
    ticket.events.push({
      id: `${id}-ev-${ticket.events.length + 1}`,
      ticket_id: id,
      event_type: 'status_changed',
      actor_id: actorId,
      payload: { from, to: 'assigned' },
      created_at: ticket.updated_at,
    })
  }

  ticket.events.push({
    id: `${id}-ev-${ticket.events.length + 1}`,
    ticket_id: id,
    event_type: 'assigned',
    actor_id: actorId,
    payload: { assigned_to: assignedTo, previous },
    created_at: ticket.updated_at,
  })
  return ticket
}

export function memAddEvent(
  ticketId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  actorId: string | null = null,
) {
  const ticket = store().tickets.get(ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const event = {
    id: `${ticketId}-ev-${ticket.events.length + 1}`,
    ticket_id: ticketId,
    event_type: eventType,
    actor_id: actorId,
    payload,
    created_at: new Date().toISOString(),
  }
  ticket.events.push(event)
  ticket.updated_at = event.created_at
  return event
}

export function memAddMessage(
  ticketId: string,
  msg: {
    channel: string
    direction: 'inbound' | 'outbound' | 'system' | string
    body: string | null
    media_url?: string | null
    wa_message_id?: string | null
  },
) {
  const ticket = store().tickets.get(ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const row = {
    id: `${ticketId}-msg-${ticket.messages.length + 1}`,
    ticket_id: ticketId,
    channel: msg.channel,
    direction: msg.direction,
    body: msg.body,
    media_url: msg.media_url ?? null,
    created_at: new Date().toISOString(),
  }
  ticket.messages.push(row)
  ticket.updated_at = row.created_at
  return row
}

export function memFindStoreByCode(code: string): StoreRow | undefined {
  return memStore(code)
}

export function memGetSession(waId: string): MemSession | undefined {
  return store().sessions.get(waId)
}

export function memUpsertSession(
  session: Omit<MemSession, 'updated_at' | 'expires_at'> & {
    updated_at?: string
    expires_at?: string
  },
): MemSession {
  const now = new Date().toISOString()
  const full: MemSession = {
    wa_id: session.wa_id,
    country_id: session.country_id,
    store_id: session.store_id,
    store_code: session.store_code,
    state: session.state,
    pending_description: session.pending_description ?? null,
    expires_at:
      session.expires_at ??
      new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    updated_at: session.updated_at ?? now,
  }
  store().sessions.set(full.wa_id, full)
  return full
}

/** @returns true if messageId was already processed (duplicate). */
export function memDedupe(messageId: string): boolean {
  const mem = store()
  if (mem.processed.has(messageId)) return true
  mem.processed.add(messageId)
  return false
}
