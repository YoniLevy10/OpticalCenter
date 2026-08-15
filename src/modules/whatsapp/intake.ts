import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseStoreCodeFromText } from '@/modules/tickets/constants'
import { WA_COPY } from './copy'
import { inferSourceFromText } from './parse'
import { sendWhatsAppText } from './send'
import type { InboundMessage, IntakeResult, IntakeState, TicketSource } from './types'

type CountryRow = {
  id: string
  organization_id: string
  code: string
  whatsapp_phone_number_id: string | null
  whatsapp_access_token: string | null
}

type StoreRow = {
  id: string
  code: string
  name: string
  organization_id: string
  country_id: string
  region_id: string
}

type SessionRow = {
  id: string
  organization_id: string
  country_id: string
  wa_id: string
  store_id: string | null
  store_code: string | null
  state: IntakeState
  pending_description: string | null
  expires_at: string
}

function admin(): SupabaseClient {
  return createAdminClient()
}

export async function resolveCountryByPhoneNumberId(
  supabase: SupabaseClient,
  phoneNumberId: string | null,
): Promise<CountryRow | null> {
  const id =
    phoneNumberId ||
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    null

  if (id) {
    const { data } = await supabase
      .from('countries')
      .select('id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token')
      .eq('whatsapp_phone_number_id', id)
      .maybeSingle()
    if (data) return data as CountryRow
  }

  // Pilot fallback: Israel (or first country)
  const { data: il } = await supabase
    .from('countries')
    .select('id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token')
    .eq('code', 'IL')
    .maybeSingle()
  if (il) return il as CountryRow

  const { data: anyCountry } = await supabase
    .from('countries')
    .select('id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token')
    .limit(1)
    .maybeSingle()
  return (anyCountry as CountryRow) ?? null
}

export async function resolveStoreByCode(
  supabase: SupabaseClient,
  countryId: string,
  code: string,
): Promise<StoreRow | null> {
  const { data } = await supabase
    .from('stores')
    .select('id, code, name, organization_id, country_id, region_id')
    .eq('country_id', countryId)
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()
  return (data as StoreRow) ?? null
}

async function markProcessed(
  supabase: SupabaseClient,
  messageId: string,
  countryId: string,
): Promise<boolean> {
  const { error } = await supabase.from('processed_webhooks').insert({
    message_id: messageId,
    country_id: countryId,
  })
  if (error) {
    // unique violation → duplicate
    if (error.code === '23505') return false
    console.error('[whatsapp] dedupe insert failed', error.message)
    // proceed cautiously if table missing in early env
    if (error.message?.includes('processed_webhooks')) return true
    return false
  }
  return true
}

async function getOrCreateSession(
  supabase: SupabaseClient,
  country: CountryRow,
  waId: string,
): Promise<SessionRow> {
  const { data: existing } = await supabase
    .from('intake_sessions')
    .select(
      'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, expires_at',
    )
    .eq('country_id', country.id)
    .eq('wa_id', waId)
    .maybeSingle()

  const now = Date.now()
  if (existing) {
    const expired = new Date(existing.expires_at).getTime() < now
    if (!expired && existing.state !== 'done') {
      return existing as SessionRow
    }
    // Reset expired / completed sessions for a new report
    const { data: updated, error } = await supabase
      .from('intake_sessions')
      .update({
        store_id: null,
        store_code: null,
        state: 'awaiting_store',
        pending_description: null,
        expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(
        'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, expires_at',
      )
      .single()
    if (error || !updated) throw new Error(error?.message || 'session reset failed')
    return updated as SessionRow
  }

  const { data: created, error } = await supabase
    .from('intake_sessions')
    .insert({
      organization_id: country.organization_id,
      country_id: country.id,
      wa_id: waId,
      state: 'awaiting_store',
      expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
    })
    .select(
      'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, expires_at',
    )
    .single()
  if (error || !created) throw new Error(error?.message || 'session create failed')
  return created as SessionRow
}

async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  patch: Partial<{
    store_id: string | null
    store_code: string | null
    state: IntakeState
    pending_description: string | null
  }>,
) {
  await supabase
    .from('intake_sessions')
    .update({
      ...patch,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
}

function displayNumberFor(storeCode: string, number: number | null): string {
  if (number != null) return `OC-${number}`
  return `OC-${storeCode}-${Date.now().toString().slice(-5)}`
}

async function createTicketFromSession(params: {
  supabase: SupabaseClient
  session: SessionRow
  store: StoreRow
  description: string
  mediaUrl: string | null
  waId: string
  messageId: string
  source: TicketSource
  inboundText: string | null
}): Promise<{ ticketId: string; displayNumber: string }> {
  const { supabase, store, description, mediaUrl, waId, messageId, source, inboundText } =
    params

  const title =
    description.length > 80 ? `${description.slice(0, 77)}…` : description || 'דיווח WhatsApp'

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      organization_id: store.organization_id,
      country_id: store.country_id,
      region_id: store.region_id,
      store_id: store.id,
      title,
      description: description || '(תמונה ללא טקסט)',
      source,
      reporter_phone: waId,
      language: 'he',
      status: 'new',
      priority: 'medium',
      category: 'other',
    })
    .select('id, number')
    .single()

  if (error || !ticket) throw new Error(error?.message || 'ticket insert failed')

  const displayNumber = displayNumberFor(store.code, ticket.number as number | null)
  await supabase
    .from('tickets')
    .update({ display_number: displayNumber })
    .eq('id', ticket.id)

  await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    channel: 'whatsapp',
    direction: 'inbound',
    body: inboundText || description,
    wa_message_id: messageId,
    media_url: mediaUrl,
    raw: { source },
  })

  if (mediaUrl) {
    await supabase.from('ticket_attachments').insert({
      ticket_id: ticket.id,
      url: mediaUrl,
      kind: 'image',
    })
  }

  await supabase.from('ticket_events').insert({
    ticket_id: ticket.id,
    event_type: 'ticket_created',
    payload: {
      source,
      store_code: store.code,
      wa_id: waId,
      via: 'whatsapp_intake',
    },
  })

  return { ticketId: ticket.id as string, displayNumber }
}

/**
 * Dumb intake: store (+ optional STORE_ prefill) → description (+ optional photo) → ticket.
 */
export async function processInboundMessage(
  message: InboundMessage,
  options?: { skipOutboundGraph?: boolean },
): Promise<IntakeResult> {
  try {
    const supabase = admin()
    const country = await resolveCountryByPhoneNumberId(supabase, message.phoneNumberId)
    if (!country) {
      return { ok: false, reply: WA_COPY.countryMissing, error: 'country_missing' }
    }

    const isNew = await markProcessed(supabase, message.messageId, country.id)
    if (!isNew) {
      return { ok: true, duplicate: true, reply: null }
    }

    let session = await getOrCreateSession(supabase, country, message.waId)
    const text = message.text?.trim() || null
    const storeCodeFromText = text ? parseStoreCodeFromText(text) : null
    let source = inferSourceFromText(text, message.sourceHint)

    // --- Resolve / attach store ---
    if (storeCodeFromText) {
      const store = await resolveStoreByCode(supabase, country.id, storeCodeFromText)
      if (!store) {
        const reply = WA_COPY.storeNotFound(storeCodeFromText)
        await sendReply(supabase, message, country, reply, null, options)
        return { ok: true, reply, state: session.state }
      }

      await updateSession(supabase, session.id, {
        store_id: store.id,
        store_code: store.code,
        state: 'awaiting_description',
      })
      session = {
        ...session,
        store_id: store.id,
        store_code: store.code,
        state: 'awaiting_description',
      }

      // Pure identity message (STORE_172 / 172 only) → ask for description
      const isIdentityOnly =
        !!text &&
        (text.toUpperCase().replace(/\s+/g, '') === `STORE_${store.code}` ||
          text.replace(/\s+/g, '') === store.code ||
          /^STORE[_\s-]?\d{1,6}$/i.test(text.trim()))

      if (isIdentityOnly && !message.mediaUrl) {
        const reply = WA_COPY.askDescription(store.name, store.code)
        await sendReply(supabase, message, country, reply, null, options)
        return { ok: true, reply, state: 'awaiting_description' }
      }

      // Prefill + description in one message (rare) → create ticket
      const description =
        text && !isIdentityOnly
          ? text.replace(/\bSTORE[_\s-]?\d{1,6}\b/i, '').trim() || text
          : text || ''
      if (description || message.mediaUrl) {
        return await finalizeTicket({
          supabase,
          session,
          store,
          description: description || 'תמונה מצורפת',
          message,
          source,
          country,
          options,
        })
      }
    }

    if (session.state === 'awaiting_store' || !session.store_id) {
      const reply = WA_COPY.askStore
      await sendReply(supabase, message, country, reply, null, options)
      return { ok: true, reply, state: 'awaiting_store' }
    }

    // awaiting_description
    const store = await resolveStoreByCode(
      supabase,
      country.id,
      session.store_code || '',
    )
    if (!store) {
      await updateSession(supabase, session.id, {
        store_id: null,
        store_code: null,
        state: 'awaiting_store',
      })
      const reply = WA_COPY.askStore
      await sendReply(supabase, message, country, reply, null, options)
      return { ok: true, reply, state: 'awaiting_store' }
    }

    if (!text && !message.mediaUrl) {
      const reply = WA_COPY.needDescription
      await sendReply(supabase, message, country, reply, null, options)
      return { ok: true, reply, state: 'awaiting_description' }
    }

    source =
      message.sourceHint === 'qr_whatsapp' ||
      message.sourceHint === 'nfc_whatsapp' ||
      message.sourceHint === 'whatsapp' ||
      message.sourceHint === 'demo'
        ? message.sourceHint
        : session.store_code && source === 'whatsapp'
          ? 'whatsapp'
          : source

    return await finalizeTicket({
      supabase,
      session,
      store,
      description: text || 'תמונה מצורפת',
      message,
      source,
      country,
      options,
    })
  } catch (e) {
    console.error('[whatsapp] intake error', e)
    return {
      ok: false,
      reply: WA_COPY.genericError,
      error: e instanceof Error ? e.message : 'intake_error',
    }
  }
}

async function finalizeTicket(params: {
  supabase: SupabaseClient
  session: SessionRow
  store: StoreRow
  description: string
  message: InboundMessage
  source: TicketSource
  country: CountryRow
  options?: { skipOutboundGraph?: boolean }
}): Promise<IntakeResult> {
  const { supabase, session, store, description, message, source, country, options } =
    params

  const { ticketId, displayNumber } = await createTicketFromSession({
    supabase,
    session,
    store,
    description,
    mediaUrl: message.mediaUrl,
    waId: message.waId,
    messageId: message.messageId,
    source,
    inboundText: message.text,
  })

  await updateSession(supabase, session.id, {
    state: 'done',
    pending_description: null,
  })

  const reply = WA_COPY.confirmed(displayNumber, store.name)
  await sendReply(supabase, message, country, reply, ticketId, options)

  return {
    ok: true,
    reply,
    ticketId,
    displayNumber,
    state: 'done',
  }
}

async function sendReply(
  supabase: SupabaseClient,
  message: InboundMessage,
  country: CountryRow,
  reply: string,
  ticketId: string | null,
  options?: { skipOutboundGraph?: boolean },
) {
  await sendWhatsAppText({
    toWaId: message.waId,
    text: reply,
    phoneNumberId: message.phoneNumberId || country.whatsapp_phone_number_id,
    ticketId,
    supabase: ticketId ? supabase : undefined,
    forceDryRun: options?.skipOutboundGraph === true,
  })
}

/** Demo / simulator entry — same intake, dry-run outbound Graph. */
export async function processDemoInbound(input: {
  waId: string
  text?: string | null
  storeCode?: string | null
  mediaUrl?: string | null
  source?: TicketSource | null
  messageId?: string | null
}): Promise<IntakeResult> {
  const storePrefill =
    input.storeCode && !input.text
      ? `STORE_${input.storeCode}`
      : input.storeCode && input.text && !parseStoreCodeFromText(input.text)
        ? `STORE_${input.storeCode}\n${input.text}`
        : input.text || (input.storeCode ? `STORE_${input.storeCode}` : null)

  const message: InboundMessage = {
    messageId: input.messageId || `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    waId: input.waId.replace(/\D/g, '') || input.waId,
    phoneNumberId: process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID || null,
    text: storePrefill,
    mediaUrl: input.mediaUrl || null,
    mediaKind: input.mediaUrl ? 'image' : null,
    timestamp: String(Math.floor(Date.now() / 1000)),
    sourceHint: input.source || (input.storeCode ? 'qr_whatsapp' : 'demo'),
  }

  return processInboundMessage(message, { skipOutboundGraph: true })
}
