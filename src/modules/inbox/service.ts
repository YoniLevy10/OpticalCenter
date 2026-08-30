import { createSystemClient } from '@/lib/supabase/system'
import {
  isMissingColumnError,
  isMissingTableError,
  isSupabaseSchemaError,
} from '@/lib/supabase/schema-fallback'
import {
  memListSessions,
  memSetSessionTakeover,
  memUpsertSession,
  memAddInboxMessage,
  memListInboxMessages,
  memListTickets,
  memListStores,
  MEM_COUNTRY_ID,
  supabaseReady,
  type MemSession,
} from '@/lib/data/memory-store'
import { sendWhatsAppText } from '@/modules/whatsapp/send'
import { resolveWhatsAppPhoneNumberId } from '@/modules/whatsapp/phone-number-id'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { DEMO_STORES } from '@/modules/stores/data'

const CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000

function isUuid(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function sanitizeOptionalUuid(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined
  return isUuid(trimmed) ? trimmed : undefined
}

const SESSION_SELECT_FULL =
  'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at, human_takeover, last_inbound'
const SESSION_SELECT_LEGACY =
  'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at'

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function mapSessionRow(
  row: Record<string, unknown>,
  opts?: { human_takeover?: boolean; last_inbound?: string | null },
): InboxSession {
  const rawCountry = row.country_id
  const countryId =
    rawCountry == null || rawCountry === '' || rawCountry === 'null'
      ? ''
      : String(rawCountry)

  return {
    wa_id: String(row.wa_id),
    // Never stringify SQL NULL into the literal "null" (breaks UUID validation).
    country_id: countryId,
    store_id:
      row.store_id == null || row.store_id === 'null'
        ? null
        : String(row.store_id),
    store_code: (row.store_code as string | null) ?? null,
    state: row.state as InboxSession['state'],
    pending_description: (row.pending_description as string | null) ?? null,
    expires_at: String(row.expires_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    human_takeover: opts?.human_takeover ?? Boolean(row.human_takeover),
    last_inbound:
      opts?.last_inbound !== undefined
        ? opts.last_inbound
        : ((row.last_inbound as string | null | undefined) ?? null),
  }
}

function seedDemoInboxIfEmpty() {
  let sessions = memListSessions()
  if (sessions.length === 0) {
    memUpsertSession({
      wa_id: '972501112233',
      country_id: MEM_COUNTRY_ID,
      store_id: 'demo-172',
      store_code: '172',
      state: 'awaiting_description',
      pending_description: null,
      human_takeover: false,
      last_inbound: 'המזגן לא מקרר באולם',
    })
    memUpsertSession({
      wa_id: '972509998877',
      country_id: MEM_COUNTRY_ID,
      store_id: 'demo-101',
      store_code: '101',
      state: 'awaiting_description',
      pending_description: null,
      human_takeover: true,
      last_inbound: 'דלת הכניסה לא ננעלת',
    })
    memUpsertSession({
      wa_id: '972503334455',
      country_id: MEM_COUNTRY_ID,
      store_id: 'demo-109',
      store_code: '109',
      state: 'done',
      pending_description: null,
      human_takeover: false,
      last_inbound: 'תודה, תוקן',
    })
    sessions = memListSessions()
  }
  return sessions
}

function resolveStoreName(
  storeId: string | null,
  storeCode: string | null,
  storeMap?: Map<string, { name: string; code: string }>,
): string | null {
  if (storeMap) {
    if (storeId && storeMap.has(storeId)) return storeMap.get(storeId)!.name
    if (storeCode) {
      for (const s of storeMap.values()) {
        if (s.code === storeCode) return s.name
      }
    }
  }
  const fromMem = memListStores().find(
    (s) =>
      (storeId && s.id === storeId) || (storeCode && s.code === storeCode),
  )
  if (fromMem) return fromMem.name
  const demo = DEMO_STORES.find(
    (s) =>
      (storeId && s.id === storeId) || (storeCode && s.code === storeCode),
  )
  return demo?.name ?? null
}

function formatWaDisplay(waId: string): string {
  const digits = waId.replace(/\D/g, '')
  if (digits.startsWith('972') && digits.length >= 11) {
    return `0${digits.slice(3, 5)}-${digits.slice(5, 8)}-${digits.slice(8)}`
  }
  return waId
}

function pickHighestPriority(priorities: string[]): string | null {
  if (priorities.length === 0) return null
  return [...priorities].sort(
    (a, b) => (PRIORITY_RANK[a] ?? 9) - (PRIORITY_RANK[b] ?? 9),
  )[0]
}

function enrichSession(
  session: InboxSession,
  ctx: {
    storeName: string | null
    lastMessage: string | null
    lastDirection: 'inbound' | 'outbound' | null
    openPriorities: string[]
    customerName: string | null
  },
): InboxSessionView {
  const storeLabel = ctx.storeName
    ? session.store_code
      ? `${ctx.storeName} (#${session.store_code})`
      : ctx.storeName
    : session.store_code
      ? `סניף #${session.store_code}`
      : null

  const display_name =
    ctx.customerName?.trim() ||
    storeLabel ||
    formatWaDisplay(session.wa_id)

  const unread =
    Boolean(session.human_takeover) ||
    session.state === 'awaiting_description' ||
    ctx.lastDirection === 'inbound'

  return {
    ...session,
    store_name: ctx.storeName,
    customer_name: ctx.customerName,
    display_name,
    last_message: ctx.lastMessage ?? session.last_inbound ?? null,
    unread,
    priority: pickHighestPriority(ctx.openPriorities),
    inbox_status: session.human_takeover ? 'waiting' : 'handled',
  }
}

export type InboxSession = MemSession

export type InboxSessionView = InboxSession & {
  store_name: string | null
  customer_name: string | null
  display_name: string
  last_message: string | null
  unread: boolean
  priority: string | null
  /** Derived: waiting = human takeover, handled = bot/closed. */
  inbox_status: 'waiting' | 'handled'
}

export type InboxMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  ticket_id?: string | null
}

export type InboxOpenTicket = {
  id: string
  display_number: string | null
  title: string | null
  status: string
  priority: string
  description: string
  store_code: string | null
  store_name: string | null
}

export type InboxSessionContext = {
  store_name: string | null
  store_code: string | null
  customer_name: string | null
  wa_display: string
  openTickets: InboxOpenTicket[]
}

function ticketsForWa(waId: string): InboxOpenTicket[] {
  return memListTickets()
    .filter((t) => t.reporter_phone === waId)
    .filter((t) =>
      OPEN_TICKET_STATUSES.includes(
        t.status as (typeof OPEN_TICKET_STATUSES)[number],
      ),
    )
    .map((t) => ({
      id: t.id,
      display_number: t.display_number,
      title: t.title,
      status: t.status,
      priority: t.priority,
      description: t.description,
      store_code: t.stores?.code ?? null,
      store_name: t.stores?.name ?? null,
    }))
}

function enrichMemorySessions(sessions: InboxSession[]): InboxSessionView[] {
  return sessions.map((session) => {
    const messages = memListInboxMessages(session.wa_id)
    const last = messages[messages.length - 1]
    const open = ticketsForWa(session.wa_id)
    const customer =
      memListTickets().find((t) => t.reporter_phone === session.wa_id)
        ?.reporter_name ?? null
    return enrichSession(session, {
      storeName: resolveStoreName(session.store_id, session.store_code),
      lastMessage: last?.body ?? session.last_inbound ?? null,
      lastDirection: last?.direction ?? (session.last_inbound ? 'inbound' : null),
      openPriorities: open.map((t) => t.priority),
      customerName: customer,
    })
  })
}

export async function listInboxSessions(): Promise<{
  sessions: InboxSessionView[]
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    return {
      sessions: enrichMemorySessions(seedDemoInboxIfEmpty()),
      backend: 'memory',
    }
  }

  const supabase = createSystemClient('inbox_sessions_list')
  const full = await supabase
    .from('intake_sessions')
    .select(SESSION_SELECT_FULL)
    .order('updated_at', { ascending: false })
    .limit(100)

  let rows: Record<string, unknown>[] | null = (full.data ?? null) as Record<
    string,
    unknown
  >[] | null
  let error = full.error

  if (error && isMissingColumnError(error, 'human_takeover')) {
    const legacy = await supabase
      .from('intake_sessions')
      .select(SESSION_SELECT_LEGACY)
      .order('updated_at', { ascending: false })
      .limit(100)
    rows = (legacy.data ?? null) as Record<string, unknown>[] | null
    error = legacy.error
  }

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return {
        sessions: enrichMemorySessions(seedDemoInboxIfEmpty()),
        backend: 'memory',
      }
    }
    throw new Error(error.message)
  }

  const sessions = (rows ?? []).map((row) => mapSessionRow(row))
  if (sessions.length === 0) {
    return {
      sessions: enrichMemorySessions(seedDemoInboxIfEmpty()),
      backend: 'memory',
    }
  }

  const waIds = sessions.map((s) => s.wa_id)
  const storeIds = [
    ...new Set(sessions.map((s) => s.store_id).filter(Boolean)),
  ] as string[]

  const storeMap = new Map<string, { name: string; code: string }>()
  if (storeIds.length > 0) {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, code, name')
      .in('id', storeIds)
    for (const s of stores ?? []) {
      storeMap.set(s.id, { name: s.name, code: s.code })
    }
  }

  const ticketByPhone = new Map<
    string,
    { priorities: string[]; customerName: string | null }
  >()
  if (waIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, reporter_phone, reporter_name, priority, status')
      .in('reporter_phone', waIds)
      .in('status', [...OPEN_TICKET_STATUSES])
      .limit(200)

    for (const t of tickets ?? []) {
      const phone = t.reporter_phone as string | null
      if (!phone) continue
      const cur = ticketByPhone.get(phone) ?? {
        priorities: [],
        customerName: null,
      }
      if (t.priority) cur.priorities.push(t.priority)
      if (!cur.customerName && t.reporter_name) {
        cur.customerName = t.reporter_name as string
      }
      ticketByPhone.set(phone, cur)
    }
  }

  const lastMsgByWa = new Map<
    string,
    { body: string; direction: 'inbound' | 'outbound' }
  >()
  if (waIds.length > 0) {
    const { data: recent } = await supabase
      .from('inbox_messages')
      .select('wa_id, body, direction, created_at')
      .in('wa_id', waIds)
      .order('created_at', { ascending: false })
      .limit(300)

    for (const m of recent ?? []) {
      if (lastMsgByWa.has(m.wa_id)) continue
      lastMsgByWa.set(m.wa_id, {
        body: m.body,
        direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
      })
    }
  }

  const views = sessions.map((session) => {
    const ticketCtx = ticketByPhone.get(session.wa_id)
    const last = lastMsgByWa.get(session.wa_id)
    return enrichSession(session, {
      storeName: resolveStoreName(
        session.store_id,
        session.store_code,
        storeMap,
      ),
      lastMessage: last?.body ?? session.last_inbound ?? null,
      lastDirection:
        last?.direction ?? (session.last_inbound ? 'inbound' : null),
      openPriorities: ticketCtx?.priorities ?? [],
      customerName: ticketCtx?.customerName ?? null,
    })
  })

  return { sessions: views, backend: 'supabase' }
}

export async function setSessionTakeover(
  waId: string,
  humanTakeover: boolean,
  opts?: { state?: InboxSession['state'] },
): Promise<InboxSession> {
  if (!(await supabaseReady())) {
    return memSetSessionTakeover(waId, humanTakeover, opts)
  }

  const supabase = createSystemClient('inbox_takeover')
  const payload: Record<string, unknown> = { human_takeover: humanTakeover }
  if (opts?.state) payload.state = opts.state

  const { data, error } = await supabase
    .from('intake_sessions')
    .update(payload)
    .eq('wa_id', waId)
    .select(SESSION_SELECT_FULL)
    .single()

  if (error) {
    if (isMissingColumnError(error, 'human_takeover')) {
      const { data: legacy, error: legacyError } = await supabase
        .from('intake_sessions')
        .select(SESSION_SELECT_LEGACY)
        .eq('wa_id', waId)
        .single()
      if (legacyError) {
        if (isSupabaseSchemaError(legacyError)) {
          return memSetSessionTakeover(waId, humanTakeover, opts)
        }
        throw new Error(legacyError.message)
      }
      return mapSessionRow(legacy as Record<string, unknown>, {
        human_takeover: humanTakeover,
      })
    }
    if (isSupabaseSchemaError(error)) {
      return memSetSessionTakeover(waId, humanTakeover, opts)
    }
    throw new Error(error.message)
  }
  return mapSessionRow(data as Record<string, unknown>)
}

/**
 * Mark conversation handled (bot resumes / closed) or waiting (human takeover).
 * handled → human_takeover false + state done
 * waiting → human_takeover true
 */
export async function markSessionInboxStatus(
  waId: string,
  status: 'handled' | 'waiting',
): Promise<InboxSession> {
  if (status === 'waiting') {
    return setSessionTakeover(waId, true)
  }
  return setSessionTakeover(waId, false, { state: 'done' })
}

export async function listSessionMessages(waId: string): Promise<{
  messages: InboxMessage[]
  ticketIds: string[]
  openTickets: InboxOpenTicket[]
  context: InboxSessionContext
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    const messages = memListInboxMessages(waId)
    const ticketIds = [
      ...new Set(messages.map((m) => m.ticket_id).filter(Boolean)),
    ] as string[]
    const openTickets = ticketsForWa(waId)
    const session = memListSessions().find((s) => s.wa_id === waId)
    const store_name = resolveStoreName(
      session?.store_id ?? null,
      session?.store_code ?? null,
    )
    const customer_name =
      memListTickets().find((t) => t.reporter_phone === waId)?.reporter_name ??
      null
    for (const id of openTickets.map((t) => t.id)) {
      if (!ticketIds.includes(id)) ticketIds.push(id)
    }
    return {
      messages,
      ticketIds,
      openTickets,
      context: {
        store_name,
        store_code: session?.store_code ?? null,
        customer_name,
        wa_display: formatWaDisplay(waId),
        openTickets,
      },
      backend: 'memory',
    }
  }

  const supabase = createSystemClient('inbox_messages_list')
  const { data: inboxRows, error } = await supabase
    .from('inbox_messages')
    .select('id, direction, body, created_at, ticket_id')
    .eq('wa_id', waId)
    .order('created_at', { ascending: true })

  if (error) {
    if (
      isMissingTableError(error, 'inbox_messages') ||
      isSupabaseSchemaError(error)
    ) {
      const messages = memListInboxMessages(waId)
      const ticketIds = [
        ...new Set(messages.map((m) => m.ticket_id).filter(Boolean)),
      ] as string[]
      const openTickets = ticketsForWa(waId)
      const session = memListSessions().find((s) => s.wa_id === waId)
      return {
        messages,
        ticketIds,
        openTickets,
        context: {
          store_name: resolveStoreName(
            session?.store_id ?? null,
            session?.store_code ?? null,
          ),
          store_code: session?.store_code ?? null,
          customer_name:
            memListTickets().find((t) => t.reporter_phone === waId)
              ?.reporter_name ?? null,
          wa_display: formatWaDisplay(waId),
          openTickets,
        },
        backend: 'memory',
      }
    }
    throw new Error(error.message)
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select(
      'id, display_number, title, status, priority, description, reporter_name, store_id, stores(code, name)',
    )
    .eq('reporter_phone', waId)
    .limit(20)

  const ticketIds = (tickets ?? []).map((t) => t.id)
  const openTickets: InboxOpenTicket[] = (tickets ?? [])
    .filter((t) =>
      OPEN_TICKET_STATUSES.includes(
        t.status as (typeof OPEN_TICKET_STATUSES)[number],
      ),
    )
    .map((t) => {
      const stores = t.stores as
        | { code: string; name: string }
        | { code: string; name: string }[]
        | null
      const store = Array.isArray(stores) ? stores[0] : stores
      return {
        id: t.id,
        display_number: t.display_number,
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description ?? '',
        store_code: store?.code ?? null,
        store_name: store?.name ?? null,
      }
    })

  const ticketMessages: InboxMessage[] = []

  if (ticketIds.length > 0) {
    const { data: tMsgs } = await supabase
      .from('ticket_messages')
      .select('id, direction, body, created_at, ticket_id')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true })

    for (const m of tMsgs ?? []) {
      if (!m.body) continue
      ticketMessages.push({
        id: m.id,
        direction: m.direction === 'outbound' ? 'outbound' : 'inbound',
        body: m.body,
        created_at: m.created_at,
        ticket_id: m.ticket_id,
      })
    }
  }

  const combined = [
    ...(inboxRows ?? []).map((m) => ({
      id: m.id,
      direction: m.direction as 'inbound' | 'outbound',
      body: m.body,
      created_at: m.created_at,
      ticket_id: m.ticket_id,
    })),
    ...ticketMessages,
  ].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const seen = new Set<string>()
  const messages = combined.filter((m) => {
    const key = `${m.id}:${m.body}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const { data: sessionRow } = await supabase
    .from('intake_sessions')
    .select('store_id, store_code')
    .eq('wa_id', waId)
    .maybeSingle()

  const store_name = resolveStoreName(
    (sessionRow?.store_id as string | null) ?? null,
    (sessionRow?.store_code as string | null) ?? null,
  )
  const customer_name =
    (tickets ?? []).find((t) => t.reporter_name)?.reporter_name ?? null

  return {
    messages,
    ticketIds,
    openTickets,
    context: {
      store_name,
      store_code: (sessionRow?.store_code as string | null) ?? null,
      customer_name,
      wa_display: formatWaDisplay(waId),
      openTickets,
    },
    backend: 'supabase',
  }
}

export async function replyToSession(input: {
  waId: string
  text: string
  countryId?: string
  ticketId?: string | null
}): Promise<{ message: InboxMessage; send: Awaited<ReturnType<typeof sendWhatsAppText>> }> {
  const text = input.text.trim()
  if (!text) throw new Error('הודעה ריקה')

  const waId = input.waId.replace(/\D/g, '') || input.waId
  if (!waId) throw new Error('מזהה WhatsApp חסר')

  const ticketIdInput = sanitizeOptionalUuid(input.ticketId ?? undefined) ?? null
  const countryIdInput = sanitizeOptionalUuid(input.countryId)

  if (!(await supabaseReady())) {
    const message = memAddInboxMessage({
      wa_id: waId,
      direction: 'outbound',
      body: text,
      ticket_id: ticketIdInput,
    })
    const send = await sendWhatsAppText({
      toWaId: waId,
      text,
      ticketId: ticketIdInput,
      purpose: 'ops_reply',
      forceDryRun: true,
    })
    return { message, send }
  }

  const supabase = createSystemClient('inbox_reply')

  // Never fall back to memory demo country UUID — that FK-fails in production.
  let countryId = countryIdInput ?? null
  let phoneNumberIdCandidate: string | null = null
  let lastInboundAt: string | null = null

  if (countryId) {
    const { data: byId } = await supabase
      .from('countries')
      .select('id, whatsapp_phone_number_id')
      .eq('id', countryId)
      .maybeSingle()
    if (byId?.id) {
      countryId = byId.id
      phoneNumberIdCandidate = byId.whatsapp_phone_number_id ?? null
    } else {
      countryId = null
    }
  }

  {
    const { data: sessions } = await supabase
      .from('intake_sessions')
      .select('country_id')
      .eq('wa_id', waId)
      .order('updated_at', { ascending: false })
      .limit(1)
    const sessionCountryId = sessions?.[0]?.country_id as string | undefined
    if (!countryId && sessionCountryId) {
      countryId = sessionCountryId
      const { data: c } = await supabase
        .from('countries')
        .select('whatsapp_phone_number_id')
        .eq('id', sessionCountryId)
        .maybeSingle()
      phoneNumberIdCandidate = c?.whatsapp_phone_number_id ?? null
    }
  }

  // Last inbound timestamp (message body lives in last_inbound — do NOT Date.parse it).
  {
    const { data: lastIn } = await supabase
      .from('inbox_messages')
      .select('created_at')
      .eq('wa_id', waId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lastInboundAt = (lastIn?.created_at as string | undefined) ?? null
    if (!lastInboundAt) {
      const { data: waIn } = await supabase
        .from('whatsapp_messages')
        .select('created_at')
        .eq('wa_id', waId)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastInboundAt = (waIn?.created_at as string | undefined) ?? null
    }
  }

  if (!countryId) {
    const { data: il } = await supabase
      .from('countries')
      .select('id, whatsapp_phone_number_id')
      .eq('code', 'IL')
      .maybeSingle()
    if (!il?.id) throw new Error('לא נמצאה מדינה לשליחה (IL)')
    countryId = il.id
    phoneNumberIdCandidate = il.whatsapp_phone_number_id ?? null
  }

  // Prefer valid Meta ID from country; otherwise env (never demo placeholders).
  const phoneNumberId = resolveWhatsAppPhoneNumberId(phoneNumberIdCandidate)

  // Active customer-care window: free-form text is allowed for 24h after last inbound.
  if (lastInboundAt) {
    const lastMs = Date.parse(lastInboundAt)
    if (Number.isFinite(lastMs) && Date.now() - lastMs > CUSTOMER_CARE_WINDOW_MS) {
      throw new Error(
        'חלון 24 השעות של WhatsApp פג עבור שיחה זו. יש לשלוח תבנית (template) מאושרת, או לבקש מהלקוח לשלוח הודעה חדשה.',
      )
    }
  }

  // Ops reply = human takeover so the bot stays quiet.
  await supabase
    .from('intake_sessions')
    .update({ human_takeover: true, updated_at: new Date().toISOString() })
    .eq('wa_id', waId)

  const send = await sendWhatsAppText({
    toWaId: waId,
    text,
    phoneNumberId,
    ticketId: ticketIdInput,
    supabase,
    purpose: 'ops_reply',
  })

  if (!send.ok || send.dryRun) {
    throw new Error(
      send.error
        ? `שליחת WhatsApp נכשלה: ${send.error}`
        : send.dryRun
          ? 'שליחת WhatsApp לא בוצעה (מצב הדמיה / חסר Phone Number ID או טוקן)'
          : 'שליחת WhatsApp נכשלה',
    )
  }

  let ticketId = ticketIdInput
  if (ticketId) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .maybeSingle()
    if (!ticket) ticketId = null
  }

  const { data, error } = await supabase
    .from('inbox_messages')
    .insert({
      country_id: countryId,
      wa_id: waId,
      direction: 'outbound',
      body: text,
      ticket_id: ticketId,
    })
    .select('id, direction, body, created_at, ticket_id')
    .single()

  if (error) {
    if (isMissingTableError(error, 'inbox_messages') || isSupabaseSchemaError(error)) {
      const message = memAddInboxMessage({
        wa_id: waId,
        direction: 'outbound',
        body: text,
        ticket_id: ticketId,
      })
      return { message, send }
    }
    throw new Error(error.message)
  }

  // Also mirror on whatsapp_messages when present (best-effort audit).
  const { data: countryRow } = await supabase
    .from('countries')
    .select('organization_id')
    .eq('id', countryId)
    .maybeSingle()
  if (countryRow?.organization_id) {
    await supabase.from('whatsapp_messages').insert({
      organization_id: countryRow.organization_id,
      country_id: countryId,
      wa_id: waId,
      direction: 'outbound',
      body: text,
      meta_message_id: send.waMessageId,
      ticket_id: ticketId,
    })
  }

  return {
    message: {
      id: data.id,
      direction: 'outbound',
      body: data.body,
      created_at: data.created_at,
      ticket_id: data.ticket_id,
    },
    send,
  }
}
