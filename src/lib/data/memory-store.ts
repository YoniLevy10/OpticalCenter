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

export type MemInboxMessage = {
  id: string
  wa_id: string
  direction: 'inbound' | 'outbound'
  body: string
  ticket_id: string | null
  created_at: string
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
  /** HQ human takeover — bot pauses replies while true. */
  human_takeover?: boolean
  last_inbound?: string | null
}

/** Operational asset health — optional; UI may also derive from open tickets. */
export type MemAssetStatus = 'ok' | 'in_service' | 'disabled'

export type MemAsset = {
  id: string
  store_id: string
  code: string
  name: string
  asset_type: string
  /** Optional client/memory status when no DB column exists. */
  status?: MemAssetStatus
  created_at: string
}

export type MemVendor = {
  id: string
  name: string
  contact_phone: string | null
  contact_email: string | null
  specialties: string
  active: boolean
  webhook_url: string | null
  /** Demo/partner HMAC secret — never expose to client UI. */
  hmac_secret: string | null
  created_at: string
}

export type MemPartnerDispatch = {
  id: string
  ticket_id: string
  vendor_id: string
  idempotency_key: string
  status: 'queued' | 'sent' | 'failed' | 'ack'
  request_hmac: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MemPushSubscription = {
  id: string
  profile_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export type MemAuditEvent = {
  id: string
  ticket_id: string
  ticket_display: string | null
  event_type: string
  actor_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

type GlobalMem = {
  tickets: Map<string, MemTicket>
  sessions: Map<string, MemSession>
  processed: Set<string>
  assets: Map<string, MemAsset>
  vendors: Map<string, MemVendor>
  dispatches: Map<string, MemPartnerDispatch>
  pushSubs: Map<string, MemPushSubscription>
  inboxMessages: Map<string, MemInboxMessage[]>
  settings: MemSettings
  seq: number
}

export type MemSettings = {
  brand_name: string
  country_label: string
  wa_business_phone: string
  sla_respond_hours_critical: number
  sla_respond_hours_high: number
  sla_respond_hours_medium: number
  sla_respond_hours_low: number
  notify_email: string
}

const DEFAULT_SETTINGS: MemSettings = {
  brand_name: 'Optical Center',
  country_label: 'ישראל · עברית',
  wa_business_phone: process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE ?? '',
  sla_respond_hours_critical: 2,
  sla_respond_hours_high: 4,
  sla_respond_hours_medium: 8,
  sla_respond_hours_low: 24,
  notify_email: '',
}

function store(): GlobalMem {
  const g = globalThis as typeof globalThis & { __maintainosMem?: GlobalMem }
  if (!g.__maintainosMem) {
    g.__maintainosMem = {
      tickets: new Map(),
      sessions: new Map(),
      processed: new Set(),
      assets: new Map(),
      vendors: new Map(),
      dispatches: new Map(),
      pushSubs: new Map(),
      inboxMessages: new Map(),
      settings: { ...DEFAULT_SETTINGS },
      seq: 18000,
    }
    seedDemoAssets(g.__maintainosMem)
    seedDemoVendors(g.__maintainosMem)
  }
  // Backfill fields if an older in-process shape exists
  const mem = g.__maintainosMem
  if (!mem.sessions) mem.sessions = new Map()
  if (!mem.processed) mem.processed = new Set()
  if (!mem.assets) {
    mem.assets = new Map()
    seedDemoAssets(mem)
  }
  if (!mem.vendors) {
    mem.vendors = new Map()
    seedDemoVendors(mem)
  }
  if (!mem.dispatches) mem.dispatches = new Map()
  if (!mem.pushSubs) mem.pushSubs = new Map()
  if (!mem.inboxMessages) mem.inboxMessages = new Map()
  if (!mem.settings) mem.settings = { ...DEFAULT_SETTINGS }
  return mem
}

function seedDemoAssets(mem: GlobalMem) {
  if (mem.assets.size > 0) return
  const now = new Date().toISOString()
  mem.assets.set('asset-demo-ac04', {
    id: 'asset-demo-ac04',
    store_id: 'demo-172',
    code: 'AC-04',
    name: 'יחידת מיזוג ראשית',
    asset_type: 'hvac',
    status: 'ok',
    created_at: now,
  })
  mem.assets.set('asset-demo-ac05', {
    id: 'asset-demo-ac05',
    store_id: 'demo-172',
    code: 'AC-05',
    name: 'מזגן מחסן',
    asset_type: 'hvac',
    status: 'in_service',
    created_at: now,
  })
  mem.assets.set('asset-demo-opt01', {
    id: 'asset-demo-opt01',
    store_id: 'demo-101',
    code: 'OPT-01',
    name: 'מכשיר מדידה',
    asset_type: 'optical',
    status: 'disabled',
    created_at: now,
  })
}

function seedDemoVendors(mem: GlobalMem) {
  if (mem.vendors.size > 0) return
  const now = new Date().toISOString()
  mem.vendors.set('vendor-demo-coolair', {
    id: 'vendor-demo-coolair',
    name: 'CoolAir שירות מיזוג',
    contact_phone: '972501234567',
    contact_email: 'dispatch@coolair.example',
    specialties: 'hvac',
    active: true,
    webhook_url: null,
    hmac_secret: 'demo-partner-hmac-secret',
    created_at: now,
  })
  mem.vendors.set('vendor-demo-electro', {
    id: 'vendor-demo-electro',
    name: 'אלקטרו-פלוס',
    contact_phone: '972509876543',
    contact_email: null,
    specialties: 'electrical',
    active: true,
    webhook_url: null,
    hmac_secret: 'demo-partner-hmac-secret-2',
    created_at: now,
  })
}

/** Test/demo helper: wipe in-memory tickets/sessions (FORCE_MEMORY only). */
export function memReset() {
  const g = globalThis as typeof globalThis & { __maintainosMem?: GlobalMem }
  g.__maintainosMem = {
    tickets: new Map(),
    sessions: new Map(),
    processed: new Set(),
    assets: new Map(),
    vendors: new Map(),
    dispatches: new Map(),
    pushSubs: new Map(),
    inboxMessages: new Map(),
    settings: { ...DEFAULT_SETTINGS },
    seq: 18000,
  }
  const mem = g.__maintainosMem
  seedDemoAssets(mem)
  seedDemoVendors(mem)
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
    human_takeover?: boolean
    last_inbound?: string | null
  },
): MemSession {
  const now = new Date().toISOString()
  const existing = store().sessions.get(session.wa_id)
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
    human_takeover: session.human_takeover ?? existing?.human_takeover ?? false,
    last_inbound: session.last_inbound ?? existing?.last_inbound ?? null,
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

export function memListSessions(): MemSession[] {
  return [...store().sessions.values()].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  )
}

export function memSetSessionTakeover(waId: string, human_takeover: boolean) {
  const s = store().sessions.get(waId)
  if (!s) throw new Error('שיחה לא נמצאה')
  s.human_takeover = human_takeover
  s.updated_at = new Date().toISOString()
  return s
}

export function memListInboxMessages(waId: string): MemInboxMessage[] {
  const mem = store()
  const rows = [...(mem.inboxMessages.get(waId) ?? [])]
  const session = mem.sessions.get(waId)
  if (session?.last_inbound) {
    const hasInbound = rows.some(
      (m) => m.direction === 'inbound' && m.body === session.last_inbound,
    )
    if (!hasInbound) {
      rows.unshift({
        id: `${waId}-last-inbound`,
        wa_id: waId,
        direction: 'inbound',
        body: session.last_inbound,
        ticket_id: null,
        created_at: session.updated_at,
      })
    }
  }
  return rows.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function memAddInboxMessage(input: {
  wa_id: string
  direction: 'inbound' | 'outbound'
  body: string
  ticket_id?: string | null
}): MemInboxMessage {
  const mem = store()
  if (!mem.inboxMessages) mem.inboxMessages = new Map()
  const row: MemInboxMessage = {
    id: `inbox-${crypto.randomUUID()}`,
    wa_id: input.wa_id,
    direction: input.direction,
    body: input.body,
    ticket_id: input.ticket_id ?? null,
    created_at: new Date().toISOString(),
  }
  const list = mem.inboxMessages.get(input.wa_id) ?? []
  list.push(row)
  mem.inboxMessages.set(input.wa_id, list)
  if (input.direction === 'inbound') {
    const session = mem.sessions.get(input.wa_id)
    if (session) {
      session.last_inbound = input.body
      session.updated_at = row.created_at
    }
  }
  return row
}

export function memListAssets(storeId?: string): MemAsset[] {
  const all = [...store().assets.values()]
  const filtered = storeId ? all.filter((a) => a.store_id === storeId) : all
  return filtered.sort((a, b) => a.code.localeCompare(b.code, 'he'))
}

export function memCreateAsset(input: {
  store_id: string
  code: string
  name: string
  asset_type?: string
  status?: MemAssetStatus
}): MemAsset {
  const code = input.code.trim().toUpperCase()
  if ([...store().assets.values()].some(
    (a) => a.store_id === input.store_id && a.code === code,
  )) {
    throw new Error('קוד נכס כבר קיים בחנות זו')
  }
  const row: MemAsset = {
    id: `asset-${crypto.randomUUID()}`,
    store_id: input.store_id,
    code,
    name: input.name.trim(),
    asset_type: input.asset_type?.trim() || 'other',
    status: input.status ?? 'ok',
    created_at: new Date().toISOString(),
  }
  store().assets.set(row.id, row)
  return row
}

export function memUpdateAsset(
  id: string,
  patch: Partial<Pick<MemAsset, 'name' | 'code' | 'asset_type' | 'status'>>,
): MemAsset {
  const row = store().assets.get(id)
  if (!row) throw new Error('נכס לא נמצא')
  if (patch.code && patch.code !== row.code) {
    const code = patch.code.trim().toUpperCase()
    if ([...store().assets.values()].some(
      (a) => a.store_id === row.store_id && a.code === code && a.id !== id,
    )) {
      throw new Error('קוד נכס כבר קיים בחנות זו')
    }
    row.code = code
  }
  if (patch.name != null) row.name = patch.name.trim()
  if (patch.asset_type != null) row.asset_type = patch.asset_type.trim() || 'other'
  if (patch.status != null) row.status = patch.status
  return row
}

export function memDeleteAsset(id: string) {
  if (!store().assets.delete(id)) throw new Error('נכס לא נמצא')
}

export function memGetSettings(): MemSettings {
  return { ...store().settings }
}

export function memUpdateSettings(patch: Partial<MemSettings>): MemSettings {
  const s = store().settings
  Object.assign(s, patch)
  return { ...s }
}

export function memListVendors(activeOnly = false): MemVendor[] {
  const all = [...store().vendors.values()]
  const filtered = activeOnly ? all.filter((v) => v.active) : all
  return filtered.sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

export function memGetVendor(id: string): MemVendor | undefined {
  return store().vendors.get(id)
}

export function memCreateVendor(input: {
  name: string
  contact_phone?: string | null
  contact_email?: string | null
  specialties?: string
  webhook_url?: string | null
  hmac_secret?: string | null
}): MemVendor {
  const name = input.name.trim()
  if (!name) throw new Error('שם ספק חובה')
  const row: MemVendor = {
    id: `vendor-${crypto.randomUUID()}`,
    name,
    contact_phone: input.contact_phone?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    specialties: input.specialties?.trim() || 'general',
    active: true,
    webhook_url: input.webhook_url?.trim() || null,
    hmac_secret: input.hmac_secret?.trim() || `secret-${crypto.randomUUID().slice(0, 12)}`,
    created_at: new Date().toISOString(),
  }
  store().vendors.set(row.id, row)
  return row
}

export function memUpdateVendor(
  id: string,
  patch: Partial<
    Pick<
      MemVendor,
      | 'name'
      | 'contact_phone'
      | 'contact_email'
      | 'specialties'
      | 'active'
      | 'webhook_url'
      | 'hmac_secret'
    >
  >,
): MemVendor {
  const row = store().vendors.get(id)
  if (!row) throw new Error('ספק לא נמצא')
  if (patch.name != null) {
    const name = patch.name.trim()
    if (!name) throw new Error('שם ספק חובה')
    row.name = name
  }
  if (patch.contact_phone !== undefined)
    row.contact_phone = patch.contact_phone?.trim() || null
  if (patch.contact_email !== undefined)
    row.contact_email = patch.contact_email?.trim() || null
  if (patch.specialties != null) row.specialties = patch.specialties.trim() || 'general'
  if (patch.active != null) row.active = patch.active
  if (patch.webhook_url !== undefined)
    row.webhook_url = patch.webhook_url?.trim() || null
  if (patch.hmac_secret !== undefined)
    row.hmac_secret = patch.hmac_secret?.trim() || row.hmac_secret
  return row
}

export function memFindDispatchByIdempotency(
  key: string,
): MemPartnerDispatch | undefined {
  return [...store().dispatches.values()].find((d) => d.idempotency_key === key)
}

export function memSaveDispatch(row: MemPartnerDispatch): MemPartnerDispatch {
  store().dispatches.set(row.id, row)
  return row
}

export function memListDispatches(ticketId?: string): MemPartnerDispatch[] {
  const all = [...store().dispatches.values()]
  const filtered = ticketId ? all.filter((d) => d.ticket_id === ticketId) : all
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function memListRecentEvents(limit = 100): MemAuditEvent[] {
  const events: MemAuditEvent[] = []
  for (const t of store().tickets.values()) {
    for (const e of t.events) {
      events.push({
        id: e.id,
        ticket_id: t.id,
        ticket_display: t.display_number,
        event_type: e.event_type,
        actor_id: e.actor_id ?? null,
        payload: e.payload ?? {},
        created_at: e.created_at,
      })
    }
  }
  return events
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

export function memUpsertPushSubscription(input: {
  profile_id: string
  endpoint: string
  p256dh: string
  auth: string
}): MemPushSubscription {
  const existing = [...store().pushSubs.values()].find(
    (s) => s.endpoint === input.endpoint,
  )
  if (existing) {
    existing.profile_id = input.profile_id
    existing.p256dh = input.p256dh
    existing.auth = input.auth
    return existing
  }
  const row: MemPushSubscription = {
    id: `push-${crypto.randomUUID()}`,
    profile_id: input.profile_id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    created_at: new Date().toISOString(),
  }
  store().pushSubs.set(row.id, row)
  return row
}

export function memListPushSubscriptions(profileId?: string): MemPushSubscription[] {
  const all = [...store().pushSubs.values()]
  return profileId ? all.filter((s) => s.profile_id === profileId) : all
}

export function memDeletePushSubscription(endpoint: string): boolean {
  const mem = store()
  for (const [id, row] of mem.pushSubs) {
    if (row.endpoint === endpoint) {
      mem.pushSubs.delete(id)
      return true
    }
  }
  return false
}

export function memFilterTickets(
  tickets: MemTicket[],
  filters: {
    status?: string
    priority?: string
    storeCode?: string
    assignedTo?: string
    q?: string
  },
): MemTicket[] {
  const q = filters.q?.trim().toLowerCase()
  return tickets.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.storeCode && t.stores?.code !== filters.storeCode) return false
    if (filters.assignedTo === 'none' && t.assigned_to) return false
    if (
      filters.assignedTo &&
      filters.assignedTo !== 'none' &&
      t.assigned_to !== filters.assignedTo
    ) {
      return false
    }
    if (q) {
      const hay = [
        t.display_number ?? '',
        t.number != null ? `OC-${t.number}` : '',
        t.description,
        t.title ?? '',
        t.stores?.name ?? '',
        t.stores?.code ?? '',
        t.stores?.city ?? '',
        t.category ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
