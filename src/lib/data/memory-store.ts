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
  first_response_at: string | null
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
  assignee: {
    id: string
    full_name: string | null
    email: string | null
    phone?: string | null
  } | null
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
    phone: '+972501000001',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    full_name: 'מיכל לוי',
    email: 'michal.levy@optical-center.demo',
    phone: '+972501000002',
  },
] as const

export const MEM_ORG_ID = '11111111-1111-1111-1111-111111111111'
export const MEM_COUNTRY_ID = '22222222-2222-2222-2222-222222222222'
export const MEM_COUNTRY_FR_ID = '33333333-3333-3333-3333-333333333333'
export const MEM_WA_PHONE_IL = 'wa_phone_il_demo'
export const MEM_WA_PHONE_FR = 'wa_phone_fr_demo'
export const MEM_KNOWN_EMPLOYEE_WA = '972501112233'

export type MemStore = StoreRow & {
  organization_id: string
  country_id: string
  is_active: boolean
}

const MEM_STORES: MemStore[] = [
  ...DEMO_STORES.map((s) => ({
    ...s,
    organization_id: MEM_ORG_ID,
    country_id: MEM_COUNTRY_ID,
    is_active: s.is_active ?? true,
  })),
  {
    id: 'demo-fr-172',
    code: '172',
    name: 'Paris Opéra',
    city: 'Paris',
    address: null,
    region_id: 'idf',
    organization_id: MEM_ORG_ID,
    country_id: MEM_COUNTRY_FR_ID,
    is_active: true,
  },
]

const MEM_PHONES: { wa_id: string; store_id: string; country_id: string }[] = [
  {
    wa_id: MEM_KNOWN_EMPLOYEE_WA,
    store_id: 'demo-172',
    country_id: MEM_COUNTRY_ID,
  },
]

export function memResolveCountryByPhoneNumberId(phoneNumberId: string | null): {
  id: string
  organization_id: string
  code: string
  whatsapp_phone_number_id: string | null
  whatsapp_access_token: string | null
} | null {
  const id =
    phoneNumberId ||
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    MEM_WA_PHONE_IL
  if (id === MEM_WA_PHONE_FR || id === 'wa_phone_fr_demo') {
    return {
      id: MEM_COUNTRY_FR_ID,
      organization_id: MEM_ORG_ID,
      code: 'FR',
      whatsapp_phone_number_id: MEM_WA_PHONE_FR,
      whatsapp_access_token: null,
    }
  }
  if (id === MEM_WA_PHONE_IL || id === process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID) {
    return {
      id: MEM_COUNTRY_ID,
      organization_id: MEM_ORG_ID,
      code: 'IL',
      whatsapp_phone_number_id: MEM_WA_PHONE_IL,
      whatsapp_access_token: null,
    }
  }
  // Unknown — do not guess
  if (phoneNumberId) return null
  // Dev default when no phoneNumberId on message: IL demo line
  return {
    id: MEM_COUNTRY_ID,
    organization_id: MEM_ORG_ID,
    code: 'IL',
    whatsapp_phone_number_id: MEM_WA_PHONE_IL,
    whatsapp_access_token: null,
  }
}

export function memFindStoreByCodeInCountry(
  countryId: string,
  code: string,
): MemStore | undefined {
  return MEM_STORES.find((s) => s.country_id === countryId && s.code === code)
}

export function memResolveStoreByWaId(
  waId: string,
  countryId: string | null,
): {
  id: string
  code: string
  name: string
  organization_id: string
  country_id: string
  region_id: string
} | null {
  const row = MEM_PHONES.find((p) => p.wa_id === waId)
  if (!row) return null
  if (countryId && row.country_id !== countryId) return null
  const store = MEM_STORES.find((s) => s.id === row.store_id)
  if (!store) return null
  return {
    id: store.id,
    code: store.code,
    name: store.name,
    organization_id: store.organization_id,
    country_id: store.country_id,
    region_id: store.region_id,
  }
}

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

/** Test/demo helper: wipe in-memory tickets/sessions (FORCE_MEMORY only). */
export function memReset() {
  const g = globalThis as typeof globalThis & { __maintainosMem?: GlobalMem }
  g.__maintainosMem = {
    tickets: new Map(),
    sessions: new Map(),
    processed: new Set(),
    seq: 18000,
  }
  return g.__maintainosMem
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
  return MEM_STORES.find((s) => s.country_id === MEM_COUNTRY_ID && s.code === code)
}

export function memFindStoreById(id: string): MemStore | undefined {
  return MEM_STORES.find((s) => s.id === id)
}

export function memCountryIdFromCode(code?: string | null): string | null {
  if (!code) return null
  const c = code.trim().toUpperCase()
  if (c === 'IL') return MEM_COUNTRY_ID
  if (c === 'FR') return MEM_COUNTRY_FR_ID
  return null
}

export function memFindStoreByCode(code: string): MemStore | undefined {
  return MEM_STORES.find((s) => s.country_id === MEM_COUNTRY_ID && s.code === code)
}

export function memListStores(opts?: {
  countryId?: string
  activeOnly?: boolean
}): MemStore[] {
  const countryId = opts?.countryId ?? MEM_COUNTRY_ID
  const activeOnly = opts?.activeOnly !== false
  return MEM_STORES.filter((s) => {
    if (s.country_id !== countryId) return false
    if (activeOnly && !s.is_active) return false
    return true
  }).sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }))
}

export function memCreateStore(input: {
  code: string
  name: string
  city?: string | null
  address?: string | null
  region_id?: string
  country_id?: string
  organization_id?: string
}): MemStore {
  const code = input.code.trim()
  if (!/^\d{1,6}$/.test(code)) {
    throw new Error('קוד חנות חייב להיות מספרי (עד 6 ספרות)')
  }
  const countryId = input.country_id ?? MEM_COUNTRY_ID
  if (MEM_STORES.some((s) => s.country_id === countryId && s.code === code)) {
    throw new Error(`חנות עם קוד ${code} כבר קיימת`)
  }
  const store: MemStore = {
    id: `demo-${countryId.slice(0, 4)}-${code}-${crypto.randomUUID().slice(0, 8)}`,
    code,
    name: input.name.trim(),
    city: input.city?.trim() || null,
    address: input.address?.trim() || null,
    region_id: input.region_id?.trim() || 'ta',
    organization_id: input.organization_id ?? MEM_ORG_ID,
    country_id: countryId,
    is_active: true,
  }
  MEM_STORES.push(store)
  return store
}

export function memUpdateStore(
  id: string,
  patch: {
    name?: string
    city?: string | null
    address?: string | null
    region_id?: string
    is_active?: boolean
  },
): MemStore {
  const store = MEM_STORES.find((s) => s.id === id)
  if (!store) throw new Error('חנות לא נמצאה')
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error('שם חנות חובה')
    store.name = name
  }
  if (patch.city !== undefined) store.city = patch.city?.trim() || null
  if (patch.address !== undefined) store.address = patch.address?.trim() || null
  if (patch.region_id !== undefined) store.region_id = patch.region_id.trim() || store.region_id
  if (patch.is_active !== undefined) store.is_active = patch.is_active
  return store
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
    organization_id:
      'organization_id' in input.store && input.store.organization_id
        ? String(input.store.organization_id)
        : MEM_ORG_ID,
    country_id:
      'country_id' in input.store && input.store.country_id
        ? String(input.store.country_id)
        : MEM_COUNTRY_ID,
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
    first_response_at: null,
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
      ? {
          id: tech.id,
          full_name: tech.full_name,
          email: tech.email,
          phone: tech.phone,
        }
      : { id: ticket.assigned_to, full_name: null, email: null, phone: null }
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
    ? {
        id: tech.id,
        full_name: tech.full_name,
        email: tech.email,
        phone: tech.phone,
      }
    : { id: assignedTo, full_name: null, email: null, phone: null }

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
