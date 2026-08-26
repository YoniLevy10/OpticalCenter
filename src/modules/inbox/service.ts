import { createSystemClient } from '@/lib/supabase/system'
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
    return { sessions, backend: 'memory' }
  }

  const supabase = createSystemClient('inbox_sessions_list')
  const { data, error } = await supabase
    .from('intake_sessions')
    .select(
      'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at, human_takeover, last_inbound',
    )
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)

  const sessions: InboxSession[] = (data ?? []).map((row) => ({
    wa_id: row.wa_id,
    country_id: row.country_id,
    store_id: row.store_id,
    store_code: row.store_code,
    state: row.state as InboxSession['state'],
    pending_description: row.pending_description,
    expires_at: row.expires_at,
    updated_at: row.updated_at,
    human_takeover: row.human_takeover ?? false,
    last_inbound: row.last_inbound,
  }))

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
    .select(
      'wa_id, country_id, store_id, store_code, state, pending_description, expires_at, updated_at, human_takeover, last_inbound',
    )
    .single()

  if (error) throw new Error(error.message)
  return {
    wa_id: data.wa_id,
    country_id: data.country_id,
    store_id: data.store_id,
    store_code: data.store_code,
    state: data.state as InboxSession['state'],
    pending_description: data.pending_description,
    expires_at: data.expires_at,
    updated_at: data.updated_at,
    human_takeover: data.human_takeover ?? false,
    last_inbound: data.last_inbound,
  }
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

  if (error) throw new Error(error.message)

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

  if (error) throw new Error(error.message)

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
