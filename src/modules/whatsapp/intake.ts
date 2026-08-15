import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  memAddMessage,
  memDedupe,
  memFindStoreByCode,
  memGetSession,
  memUpsertSession,
  MEM_COUNTRY_ID,
  MEM_ORG_ID,
  supabaseReady,
} from '@/lib/data/memory-store'
import { parseStoreCodeFromText } from '@/modules/tickets/constants'
import { createTicket } from '@/modules/tickets/service'
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

const DEMO_COUNTRY: CountryRow = {
  id: MEM_COUNTRY_ID,
  organization_id: MEM_ORG_ID,
  code: 'IL',
  whatsapp_phone_number_id:
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    null,
  whatsapp_access_token: null,
}

function admin(): SupabaseClient {
  return createAdminClient()
}

function isIdentityOnly(text: string | null, storeCode: string): boolean {
  if (!text) return false
  const compact = text.toUpperCase().replace(/\s+/g, '')
  return (
    compact === `STORE_${storeCode}` ||
    text.replace(/\s+/g, '') === storeCode ||
    /^STORE[_\s-]?\d{1,6}$/i.test(text.trim())
  )
}

export async function resolveCountryByPhoneNumberId(
  supabase: SupabaseClient | null,
  phoneNumberId: string | null,
): Promise<CountryRow | null> {
  if (!supabase) return DEMO_COUNTRY

  const id =
    phoneNumberId ||
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    null

  if (id) {
    const { data } = await supabase
      .from('countries')
      .select(
        'id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token',
      )
      .eq('whatsapp_phone_number_id', id)
      .maybeSingle()
    if (data) return data as CountryRow
  }

  const { data: il } = await supabase
    .from('countries')
    .select(
      'id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token',
    )
    .eq('code', 'IL')
    .maybeSingle()
  if (il) return il as CountryRow

  const { data: anyCountry } = await supabase
    .from('countries')
    .select(
      'id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token',
    )
    .limit(1)
    .maybeSingle()
  return (anyCountry as CountryRow) ?? DEMO_COUNTRY
}

export async function resolveStoreByCode(
  supabase: SupabaseClient | null,
  countryId: string,
  code: string,
): Promise<StoreRow | null> {
  if (!supabase) {
    const s = memFindStoreByCode(code)
    if (!s) return null
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      organization_id: MEM_ORG_ID,
      country_id: MEM_COUNTRY_ID,
      region_id: s.region_id,
    }
  }

  const { data } = await supabase
    .from('stores')
    .select('id, code, name, organization_id, country_id, region_id')
    .eq('country_id', countryId)
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()
  if (data) return data as StoreRow

  const s = memFindStoreByCode(code)
  if (!s) return null
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    organization_id: MEM_ORG_ID,
    country_id: countryId || MEM_COUNTRY_ID,
    region_id: s.region_id,
  }
}

async function markProcessed(
  supabase: SupabaseClient | null,
  messageId: string,
  countryId: string,
): Promise<boolean> {
  if (!supabase) {
    return !memDedupe(messageId)
  }
  const { error } = await supabase.from('processed_webhooks').insert({
    message_id: messageId,
    country_id: countryId,
  })
  if (error) {
    if (error.code === '23505') return false
    console.error('[whatsapp] dedupe insert failed', error.message)
    if (error.message?.includes('processed_webhooks')) return true
    return false
  }
  return true
}

async function getOrCreateSession(
  supabase: SupabaseClient | null,
  country: CountryRow,
  waId: string,
): Promise<SessionRow> {
  const now = Date.now()
  if (!supabase) {
    const existing = memGetSession(waId)
    if (existing) {
      const expired = new Date(existing.expires_at).getTime() < now
      if (!expired && existing.state !== 'done') {
        return {
          id: `mem-${waId}`,
          organization_id: MEM_ORG_ID,
          country_id: existing.country_id,
          wa_id: existing.wa_id,
          store_id: existing.store_id,
          store_code: existing.store_code,
          state: existing.state,
          pending_description: existing.pending_description,
          expires_at: existing.expires_at,
        }
      }
    }
    const session = memUpsertSession({
      wa_id: waId,
      country_id: country.id,
      store_id: null,
      store_code: null,
      state: 'awaiting_store',
      pending_description: null,
    })
    return {
      id: `mem-${waId}`,
      organization_id: MEM_ORG_ID,
      country_id: session.country_id,
      wa_id: session.wa_id,
      store_id: session.store_id,
      store_code: session.store_code,
      state: session.state,
      pending_description: session.pending_description,
      expires_at: session.expires_at,
    }
  }

  const { data: existing } = await supabase
    .from('intake_sessions')
    .select(
      'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, expires_at',
    )
    .eq('country_id', country.id)
    .eq('wa_id', waId)
    .maybeSingle()

  if (existing) {
    const expired = new Date(existing.expires_at).getTime() < now
    if (!expired && existing.state !== 'done') {
      return existing as SessionRow
    }
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
  supabase: SupabaseClient | null,
  session: SessionRow,
  patch: Partial<{
    store_id: string | null
    store_code: string | null
    state: IntakeState
    pending_description: string | null
  }>,
) {
  if (!supabase) {
    memUpsertSession({
      wa_id: session.wa_id,
      country_id: session.country_id,
      store_id: patch.store_id !== undefined ? patch.store_id : session.store_id,
      store_code:
        patch.store_code !== undefined ? patch.store_code : session.store_code,
      state: patch.state ?? session.state,
      pending_description:
        patch.pending_description !== undefined
          ? patch.pending_description
          : session.pending_description,
    })
    return
  }
  await supabase
    .from('intake_sessions')
    .update({
      ...patch,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
}

async function createTicketFromIntake(params: {
  store: StoreRow
  description: string
  mediaUrl: string | null
  waId: string
  messageId: string
  source: TicketSource
  inboundText: string | null
  useMemory: boolean
}): Promise<{ ticketId: string; displayNumber: string }> {
  const { store, description, mediaUrl, waId, messageId, source, inboundText, useMemory } =
    params

  const title =
    description.length > 80
      ? `${description.slice(0, 77)}…`
      : description || 'דיווח WhatsApp'

  const ticket = await createTicket({
    storeCode: store.code,
    storeId: store.id.startsWith('demo-') ? undefined : store.id,
    countryCode: 'IL',
    description: description || '(תמונה ללא טקסט)',
    title,
    category: 'other',
    priority: 'medium',
    source,
    reporterPhone: waId,
    language: 'he',
  })

  const displayNumber =
    ticket.display_number ||
    (ticket.number != null ? `OC-${ticket.number}` : `OC-${store.code}`)

  if (useMemory) {
    memAddMessage(ticket.id, {
      channel: 'whatsapp',
      direction: 'inbound',
      body: inboundText || description,
      media_url: mediaUrl,
      wa_message_id: messageId,
    })
  } else {
    try {
      const supabase = admin()
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
    } catch (e) {
      console.error('[whatsapp] message persist failed', e)
    }
  }

  return { ticketId: ticket.id, displayNumber }
}

/**
 * Dumb intake: store (+ optional STORE_ prefill) → description (+ optional photo) → ticket.
 * Uses Supabase when ready; otherwise in-memory sessions + createTicket().
 */
export async function processInboundMessage(
  message: InboundMessage,
  options?: { skipOutboundGraph?: boolean },
): Promise<IntakeResult> {
  try {
    const ready = await supabaseReady()
    const supabase = ready ? admin() : null
    const country = await resolveCountryByPhoneNumberId(
      supabase,
      message.phoneNumberId,
    )
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

    if (storeCodeFromText) {
      const store = await resolveStoreByCode(
        supabase,
        country.id,
        storeCodeFromText,
      )
      if (!store) {
        const reply = WA_COPY.storeNotFound(storeCodeFromText)
        await sendReply(supabase, message, country, reply, null, options)
        return { ok: true, reply, state: session.state }
      }

      await updateSession(supabase, session, {
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

      if (isIdentityOnly(text, store.code) && !message.mediaUrl) {
        const reply = WA_COPY.askDescription(store.name, store.code)
        await sendReply(supabase, message, country, reply, null, options)
        return { ok: true, reply, state: 'awaiting_description' }
      }

      const description =
        text && !isIdentityOnly(text, store.code)
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

    const store = await resolveStoreByCode(
      supabase,
      country.id,
      session.store_code || '',
    )
    if (!store) {
      await updateSession(supabase, session, {
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
  supabase: SupabaseClient | null
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

  const { ticketId, displayNumber } = await createTicketFromIntake({
    store,
    description,
    mediaUrl: message.mediaUrl,
    waId: message.waId,
    messageId: message.messageId,
    source,
    inboundText: message.text,
    useMemory: !supabase,
  })

  await updateSession(supabase, session, {
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
  supabase: SupabaseClient | null,
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
    supabase: ticketId && supabase ? supabase : undefined,
    forceDryRun: options?.skipOutboundGraph === true || !supabase,
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
    messageId:
      input.messageId ||
      `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
