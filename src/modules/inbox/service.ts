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
  MEM_COUNTRY_ID,
  supabaseReady,
  type MemSession,
} from '@/lib/data/memory-store'
import { sendWhatsAppText } from '@/modules/whatsapp/send'

const SESSION_SELECT_FULL =
  'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at, human_takeover, last_inbound'
const SESSION_SELECT_LEGACY =
  'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at'

function mapSessionRow(
  row: Record<string, unknown>,
  opts?: { human_takeover?: boolean; last_inbound?: string | null },
): InboxSession {
  return {
    wa_id: String(row.wa_id),
    country_id: String(row.country_id),
    store_id: (row.store_id as string | null) ?? null,
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
    sessions = memListSessions()
  }
  return sessions
}

export type InboxSession = MemSession

export type InboxMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  ticket_id?: string | null
}

export async function listInboxSessions(): Promise<{
  sessions: InboxSession[]
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    return { sessions: seedDemoInboxIfEmpty(), backend: 'memory' }
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
      return { sessions: seedDemoInboxIfEmpty(), backend: 'memory' }
    }
    throw new Error(error.message)
  }

  const sessions = (rows ?? []).map((row) => mapSessionRow(row))

  return { sessions, backend: 'supabase' }
}

export async function setSessionTakeover(
  waId: string,
  humanTakeover: boolean,
): Promise<InboxSession> {
  if (!(await supabaseReady())) {
    return memSetSessionTakeover(waId, humanTakeover)
  }

  const supabase = createSystemClient('inbox_takeover')
  const { data, error } = await supabase
    .from('intake_sessions')
    .update({ human_takeover: humanTakeover })
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
          return memSetSessionTakeover(waId, humanTakeover)
        }
        throw new Error(legacyError.message)
      }
      return mapSessionRow(legacy as Record<string, unknown>, {
        human_takeover: humanTakeover,
      })
    }
    if (isSupabaseSchemaError(error)) {
      return memSetSessionTakeover(waId, humanTakeover)
    }
    throw new Error(error.message)
  }
  return mapSessionRow(data as Record<string, unknown>)
}

export async function listSessionMessages(waId: string): Promise<{
  messages: InboxMessage[]
  ticketIds: string[]
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    const messages = memListInboxMessages(waId)
    const ticketIds = [...new Set(messages.map((m) => m.ticket_id).filter(Boolean))] as string[]
    return { messages, ticketIds, backend: 'memory' }
  }

  const supabase = createSystemClient('inbox_messages_list')
  const { data: inboxRows, error } = await supabase
    .from('inbox_messages')
    .select('id, direction, body, created_at, ticket_id')
    .eq('wa_id', waId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingTableError(error, 'inbox_messages')) {
      const messages = memListInboxMessages(waId)
      const ticketIds = [
        ...new Set(messages.map((m) => m.ticket_id).filter(Boolean)),
      ] as string[]
      return { messages, ticketIds, backend: 'memory' }
    }
    if (isSupabaseSchemaError(error)) {
      const messages = memListInboxMessages(waId)
      const ticketIds = [
        ...new Set(messages.map((m) => m.ticket_id).filter(Boolean)),
      ] as string[]
      return { messages, ticketIds, backend: 'memory' }
    }
    throw new Error(error.message)
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, reporter_phone')
    .eq('reporter_phone', waId)
    .limit(20)

  const ticketIds = (tickets ?? []).map((t) => t.id)
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

  return { messages, ticketIds, backend: 'supabase' }
}

export async function replyToSession(input: {
  waId: string
  text: string
  countryId?: string
  ticketId?: string | null
}): Promise<{ message: InboxMessage; send: Awaited<ReturnType<typeof sendWhatsAppText>> }> {
  const text = input.text.trim()
  if (!text) throw new Error('הודעה ריקה')

  const countryId = input.countryId ?? MEM_COUNTRY_ID

  if (!(await supabaseReady())) {
    const message = memAddInboxMessage({
      wa_id: input.waId,
      direction: 'outbound',
      body: text,
      ticket_id: input.ticketId ?? null,
    })
    const send = await sendWhatsAppText({
      toWaId: input.waId,
      text,
      ticketId: input.ticketId ?? null,
      purpose: 'ops_reply',
      forceDryRun: true,
    })
    return { message, send }
  }

  const supabase = createSystemClient('inbox_reply')
  const send = await sendWhatsAppText({
    toWaId: input.waId,
    text,
    ticketId: input.ticketId ?? null,
    supabase,
    purpose: 'ops_reply',
  })

  const { data, error } = await supabase
    .from('inbox_messages')
    .insert({
      country_id: countryId,
      wa_id: input.waId,
      direction: 'outbound',
      body: text,
      ticket_id: input.ticketId ?? null,
    })
    .select('id, direction, body, created_at, ticket_id')
    .single()

  if (error) {
    if (isMissingTableError(error, 'inbox_messages') || isSupabaseSchemaError(error)) {
      const message = memAddInboxMessage({
        wa_id: input.waId,
        direction: 'outbound',
        body: text,
        ticket_id: input.ticketId ?? null,
      })
      return { message, send }
    }
    throw new Error(error.message)
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
