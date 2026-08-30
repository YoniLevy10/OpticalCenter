import type { SupabaseClient } from '@supabase/supabase-js'
import { createSystemClient } from '@/lib/supabase/system'
import {
  memAddMessage,
  memDedupe,
  memGetSession,
  memLinkStorePhone,
  memUpsertSession,
  MEM_COUNTRY_ID,
  MEM_ORG_ID,
  supabaseReady,
} from '@/lib/data/memory-store'
import { logEvent } from '@/lib/logging'
import {
  normalizeTicketCategory,
  parseStoreCodeFromText,
} from '@/modules/tickets/constants'
import { createTicket } from '@/modules/tickets/service'
import {
  findPossibleDuplicateTicket,
  runIntakeAgent,
  type IntakeDecision,
} from './agent'
import { WA_COPY } from './copy'
import { enhanceWhatsAppMessage, type WhatsAppAiSituation } from './ai'
import { resolveInboundMediaUrl } from './media'
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
  clarification_count: number
  draft_payload: Record<string, unknown> | null
  active_ticket_id: string | null
  human_takeover: boolean
  expires_at: string
}

const SESSION_SELECT =
  'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, clarification_count, draft_payload, active_ticket_id, human_takeover, expires_at'

const SESSION_SELECT_LEGACY =
  'id, organization_id, country_id, wa_id, store_id, store_code, state, pending_description, human_takeover, expires_at'

function isMissingColumnError(error: { message?: string } | null, col: string) {
  return Boolean(error?.message && error.message.includes(col))
}

async function selectSession(
  supabase: SupabaseClient,
  countryId: string,
  waId: string,
) {
  let { data, error } = await supabase
    .from('intake_sessions')
    .select(SESSION_SELECT)
    .eq('country_id', countryId)
    .eq('wa_id', waId)
    .maybeSingle()
  if (
    error &&
    (isMissingColumnError(error, 'clarification_count') ||
      isMissingColumnError(error, 'draft_payload') ||
      isMissingColumnError(error, 'active_ticket_id'))
  ) {
    ;({ data, error } = await supabase
      .from('intake_sessions')
      .select(SESSION_SELECT_LEGACY)
      .eq('country_id', countryId)
      .eq('wa_id', waId)
      .maybeSingle())
  }
  if (error) throw new Error(error.message)
  return data
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
  return createSystemClient('whatsapp_intake')
}

void DEMO_COUNTRY

function isIdentityOnly(text: string | null, storeCode: string): boolean {
  if (!text) return false
  const compact = text.toUpperCase().replace(/\s+/g, '')
  return (
    compact === `STORE_${storeCode}` ||
    text.replace(/\s+/g, '') === storeCode ||
    /^STORE[_\s-]?\d{1,6}$/i.test(text.trim())
  )
}

function sessionFromMem(
  waId: string,
  country: CountryRow,
  existing: NonNullable<ReturnType<typeof memGetSession>>,
): SessionRow {
  return {
    id: `mem-${waId}`,
    organization_id: MEM_ORG_ID,
    country_id: existing.country_id || country.id,
    wa_id: existing.wa_id,
    store_id: existing.store_id,
    store_code: existing.store_code,
    state: existing.state,
    pending_description: existing.pending_description,
    clarification_count: existing.clarification_count ?? 0,
    draft_payload: existing.draft_payload ?? null,
    active_ticket_id: existing.active_ticket_id ?? null,
    human_takeover: Boolean(existing.human_takeover),
    expires_at: existing.expires_at,
  }
}

function normalizeSessionRow(row: Record<string, unknown>): SessionRow {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    country_id: String(row.country_id),
    wa_id: String(row.wa_id),
    store_id: (row.store_id as string | null) ?? null,
    store_code: (row.store_code as string | null) ?? null,
    state: row.state as IntakeState,
    pending_description: (row.pending_description as string | null) ?? null,
    clarification_count: Number(row.clarification_count ?? 0),
    draft_payload: (row.draft_payload as Record<string, unknown> | null) ?? null,
    active_ticket_id: (row.active_ticket_id as string | null) ?? null,
    human_takeover: Boolean(row.human_takeover),
    expires_at: String(row.expires_at),
  }
}

export async function resolveCountryByPhoneNumberId(
  supabase: SupabaseClient | null,
  phoneNumberId: string | null,
): Promise<CountryRow | null> {
  const strict =
    process.env.NODE_ENV === 'production' &&
    process.env.MAINTAINOS_FORCE_MEMORY !== '1' &&
    process.env.MAINTAINOS_WA_DEV_BYPASS !== '1'

  if (!supabase) {
    const { memResolveCountryByPhoneNumberId } = await import(
      '@/lib/data/memory-store'
    )
    return memResolveCountryByPhoneNumberId(phoneNumberId)
  }

  const id = phoneNumberId?.trim() || null
  if (!id) {
    if (strict) return null
    const envId =
      process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      null
    if (!envId) return null
    const { data } = await supabase
      .from('countries')
      .select(
        'id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token',
      )
      .eq('whatsapp_phone_number_id', envId)
      .maybeSingle()
    return (data as CountryRow) ?? null
  }

  const { data } = await supabase
    .from('countries')
    .select(
      'id, organization_id, code, whatsapp_phone_number_id, whatsapp_access_token',
    )
    .eq('whatsapp_phone_number_id', id)
    .maybeSingle()
  if (data) return data as CountryRow
  return null
}

export async function resolveStoreByCode(
  supabase: SupabaseClient | null,
  countryId: string,
  code: string,
): Promise<StoreRow | null> {
  if (!supabase) {
    const { memFindStoreByCodeInCountry } = await import('@/lib/data/memory-store')
    const s = memFindStoreByCodeInCountry(countryId, code)
    if (!s) return null
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      organization_id: s.organization_id ?? MEM_ORG_ID,
      country_id: s.country_id,
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
  return (data as StoreRow) ?? null
}

/** Hybrid identity step 1: known wa_id → store_phones mapping. */
export async function resolveStoreByWaId(
  supabase: SupabaseClient | null,
  waId: string,
  countryId?: string | null,
): Promise<StoreRow | null> {
  if (!waId) return null
  if (!supabase) {
    const { memResolveStoreByWaId } = await import('@/lib/data/memory-store')
    return memResolveStoreByWaId(waId, countryId ?? null)
  }
  const q = supabase
    .from('store_phones')
    .select(
      'store_id, stores ( id, code, name, organization_id, country_id, region_id )',
    )
    .eq('wa_id', waId)
  const { data } = await q.limit(1).maybeSingle()
  const stores = data?.stores as StoreRow | StoreRow[] | null | undefined
  if (!stores) return null
  const store = Array.isArray(stores) ? stores[0] ?? null : stores
  if (countryId && store && store.country_id !== countryId) return null
  return store
}

async function linkStorePhone(
  supabase: SupabaseClient | null,
  country: CountryRow,
  waId: string,
  store: StoreRow,
) {
  if (!waId || !store.id) return
  if (!supabase) {
    memLinkStorePhone(waId, store.id, country.id)
    return
  }
  try {
    const { data: existing } = await supabase
      .from('store_phones')
      .select('id, store_id')
      .eq('wa_id', waId)
      .limit(1)
      .maybeSingle()
    if (existing?.store_id === store.id) return
    if (existing) {
      await supabase
        .from('store_phones')
        .update({ store_id: store.id })
        .eq('id', existing.id)
      return
    }
    await supabase.from('store_phones').insert({
      store_id: store.id,
      wa_id: waId,
      is_primary: true,
      label: 'whatsapp_intake',
    })
  } catch (e) {
    logEvent('whatsapp:intake', 'warn', 'store_phone_link_failed', {
      error: e instanceof Error ? e.message : 'unknown',
    })
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

async function logWhatsAppMessage(params: {
  supabase: SupabaseClient | null
  country: CountryRow
  session: SessionRow | null
  waId: string
  direction: 'inbound' | 'outbound'
  body: string | null
  metaMessageId: string | null
  mediaKind?: string | null
  ticketId?: string | null
}) {
  const {
    supabase,
    country,
    session,
    waId,
    direction,
    body,
    metaMessageId,
    mediaKind,
    ticketId,
  } = params
  if (!supabase) return
  try {
    await supabase.from('whatsapp_messages').insert({
      organization_id: country.organization_id,
      country_id: country.id,
      wa_id: waId,
      direction,
      body,
      meta_message_id: metaMessageId,
      media_kind: mediaKind ?? null,
      ticket_id: ticketId ?? null,
      intake_session_id: session && !session.id.startsWith('mem-') ? session.id : null,
    })
  } catch {
    // Table may not exist pre-migration — non-fatal
  }
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
        return sessionFromMem(waId, country, existing)
      }
      // Keep a just-completed session so a follow-up photo attaches to the ticket.
      if (!expired && existing.state === 'done' && existing.active_ticket_id) {
        return sessionFromMem(waId, country, existing)
      }
    }
    const session = memUpsertSession({
      wa_id: waId,
      country_id: country.id,
      store_id: null,
      store_code: null,
      state: 'awaiting_store',
      pending_description: null,
      clarification_count: 0,
      draft_payload: null,
      active_ticket_id: null,
      human_takeover: false,
    })
    return sessionFromMem(waId, country, session)
  }

  const existing = await selectSession(supabase, country.id, waId)

  if (existing) {
    const expired = new Date(existing.expires_at).getTime() < now
    const row = normalizeSessionRow(existing as Record<string, unknown>)
    if (!expired && row.state !== 'done') {
      return row
    }
    if (!expired && row.state === 'done' && row.active_ticket_id) {
      return row
    }
    const resetPatch: Record<string, unknown> = {
      store_id: null,
      store_code: null,
      state: 'awaiting_store',
      pending_description: null,
      clarification_count: 0,
      draft_payload: null,
      active_ticket_id: null,
      expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }
    let { data: updated, error } = await supabase
      .from('intake_sessions')
      .update(resetPatch)
      .eq('id', existing.id)
      .select(SESSION_SELECT)
      .single()
    if (
      error &&
      (isMissingColumnError(error, 'clarification_count') ||
        isMissingColumnError(error, 'draft_payload'))
    ) {
      delete resetPatch.clarification_count
      delete resetPatch.draft_payload
      delete resetPatch.active_ticket_id
      ;({ data: updated, error } = await supabase
        .from('intake_sessions')
        .update(resetPatch)
        .eq('id', existing.id)
        .select(SESSION_SELECT_LEGACY)
        .single())
    }
    if (error || !updated) throw new Error(error?.message || 'session reset failed')
    return normalizeSessionRow(updated as Record<string, unknown>)
  }

  const insertRow: Record<string, unknown> = {
    organization_id: country.organization_id,
    country_id: country.id,
    wa_id: waId,
    state: 'awaiting_store',
    clarification_count: 0,
    expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
  }
  let { data: created, error } = await supabase
    .from('intake_sessions')
    .insert(insertRow)
    .select(SESSION_SELECT)
    .single()
  if (error && isMissingColumnError(error, 'clarification_count')) {
    delete insertRow.clarification_count
    ;({ data: created, error } = await supabase
      .from('intake_sessions')
      .insert(insertRow)
      .select(SESSION_SELECT_LEGACY)
      .single())
  }
  if (error || !created) throw new Error(error?.message || 'session create failed')
  return normalizeSessionRow(created as Record<string, unknown>)
}

type SessionPatch = Partial<{
  store_id: string | null
  store_code: string | null
  state: IntakeState
  pending_description: string | null
  clarification_count: number
  draft_payload: Record<string, unknown> | null
  active_ticket_id: string | null
  last_inbound: string | null
}>

async function updateSession(
  supabase: SupabaseClient | null,
  session: SessionRow,
  patch: SessionPatch,
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
      clarification_count:
        patch.clarification_count ?? session.clarification_count,
      draft_payload:
        patch.draft_payload !== undefined
          ? patch.draft_payload
          : session.draft_payload,
      active_ticket_id:
        patch.active_ticket_id !== undefined
          ? patch.active_ticket_id
          : session.active_ticket_id,
      human_takeover: session.human_takeover,
      last_inbound: patch.last_inbound ?? undefined,
    })
    return
  }
  const dbPatch: Record<string, unknown> = {
    ...patch,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
  // last_inbound may exist from phase6
  await supabase.from('intake_sessions').update(dbPatch).eq('id', session.id)
}

async function createTicketFromIntake(params: {
  store: StoreRow
  country: CountryRow
  description: string
  decision: IntakeDecision
  mediaUrl: string | null
  mediaKind?: InboundMessage['mediaKind']
  waId: string
  messageId: string
  source: TicketSource
  inboundText: string | null
  useMemory: boolean
}): Promise<{
  ticketId: string
  displayNumber: string
  mediaFailed: boolean
}> {
  const {
    store,
    country,
    description,
    decision,
    mediaUrl,
    mediaKind,
    waId,
    messageId,
    source,
    inboundText,
    useMemory,
  } = params

  const summary = decision.summary || description
  const title =
    summary.length > 80 ? `${summary.slice(0, 77)}…` : summary || 'דיווח WhatsApp'

  const category = normalizeTicketCategory(decision.category)

  const ticket = await createTicket({
    storeCode: store.code,
    storeId: store.id,
    countryCode: country.code,
    description: summary || description || '(תמונה ללא טקסט)',
    title,
    category,
    priority: decision.priority,
    source,
    reporterPhone: waId,
    language: country.code === 'FR' ? 'fr' : 'he',
    aiSummary: summary,
    aiRaw: {
      ai: decision.ai,
      rules: decision.rules,
      provider: decision.provider,
      original: inboundText || description,
      asset: decision.asset,
    },
  })

  const displayNumber =
    ticket.display_number ||
    (ticket.number != null ? `OC-${ticket.number}` : `OC-${store.code}`)

  const supabase = useMemory ? null : admin()
  const accessToken =
    country.whatsapp_access_token ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    null

  const resolved = await resolveInboundMediaUrl({
    mediaUrl,
    mediaKind: mediaKind ?? null,
    accessToken,
    ticketId: ticket.id,
    supabase,
    useMemory,
  })
  const resolvedUrl = resolved.url
  const mediaFailed =
    Boolean(mediaUrl) &&
    (resolved.source === 'failed' ||
      resolved.source === 'stub' ||
      !resolvedUrl)

  if (useMemory) {
    memAddMessage(ticket.id, {
      channel: 'whatsapp',
      direction: 'inbound',
      body: inboundText || description,
      media_url: resolvedUrl,
      wa_message_id: messageId,
    })
  } else {
    try {
      const client = supabase ?? admin()
      await client.from('ticket_messages').insert({
        ticket_id: ticket.id,
        channel: 'whatsapp',
        direction: 'inbound',
        body: inboundText || description,
        wa_message_id: messageId,
        media_url: resolvedUrl,
        raw: {
          source,
          media_source: resolved.source,
          media_error: resolved.error ?? null,
          ai_summary: summary,
        },
      })
      if (resolvedUrl && !resolvedUrl.startsWith('meta-media:')) {
        await client.from('ticket_attachments').insert({
          ticket_id: ticket.id,
          url: resolvedUrl,
          kind:
            mediaKind === 'document'
              ? 'document'
              : mediaKind === 'video'
                ? 'video'
                : 'image',
        })
      }
    } catch (e) {
      console.error('[whatsapp] message persist failed', e)
    }
  }

  return { ticketId: ticket.id, displayNumber, mediaFailed }
}

/** Attach a follow-up photo/video to the ticket that was just opened. */
async function attachMediaToActiveTicket(params: {
  supabase: SupabaseClient | null
  session: SessionRow
  message: InboundMessage
  country: CountryRow
  options?: { skipOutboundGraph?: boolean }
}): Promise<IntakeResult> {
  const { supabase, session, message, country, options } = params
  const ticketId = session.active_ticket_id
  if (!ticketId || !message.mediaUrl) {
    return { ok: false, reply: null, error: 'no_active_ticket' }
  }

  const accessToken =
    country.whatsapp_access_token ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    null
  const useMemory = !supabase

  const resolved = await resolveInboundMediaUrl({
    mediaUrl: message.mediaUrl,
    mediaKind: message.mediaKind ?? null,
    accessToken,
    ticketId,
    supabase,
    useMemory,
  })
  const mediaFailed =
    resolved.source === 'failed' ||
    resolved.source === 'stub' ||
    !resolved.url

  let displayNumber = ticketId.slice(0, 8)
  try {
    const { getById } = await import('@/modules/tickets/service')
    const ticket = await getById(ticketId)
    if (ticket?.display_number) displayNumber = ticket.display_number
    else if (ticket?.number != null) displayNumber = `OC-${ticket.number}`
  } catch {
    /* keep short id */
  }

  const caption = message.text?.trim() || null

  if (useMemory) {
    memAddMessage(ticketId, {
      channel: 'whatsapp',
      direction: 'inbound',
      body: caption,
      media_url: resolved.url,
      wa_message_id: message.messageId,
    })
  } else {
    try {
      const client = supabase ?? admin()
      await client.from('ticket_messages').insert({
        ticket_id: ticketId,
        channel: 'whatsapp',
        direction: 'inbound',
        body: caption,
        wa_message_id: message.messageId,
        media_url: resolved.url,
        raw: {
          follow_up: true,
          media_source: resolved.source,
          media_error: resolved.error ?? null,
        },
      })
      if (resolved.url && !resolved.url.startsWith('meta-media:')) {
        await client.from('ticket_attachments').insert({
          ticket_id: ticketId,
          url: resolved.url,
          kind:
            message.mediaKind === 'document'
              ? 'document'
              : message.mediaKind === 'video'
                ? 'video'
                : 'image',
        })
      }
    } catch (e) {
      console.error('[whatsapp] follow-up media persist failed', e)
    }
  }

  // Refresh follow-up window
  await updateSession(supabase, session, {
    state: 'done',
    active_ticket_id: ticketId,
  })

  let reply = await craftIntakeReply(
    WA_COPY.mediaAttached(displayNumber),
    'intake_confirmed',
  )
  if (mediaFailed) {
    reply = await craftIntakeReply(WA_COPY.mediaNotSaved, 'intake_media_not_saved')
  }
  await sendReply(supabase, message, country, reply, ticketId, options, session)

  logEvent('whatsapp:intake', 'info', 'media_attached', {
    ticketId,
    displayNumber,
    mediaSource: resolved.source,
  })

  return {
    ok: true,
    reply,
    ticketId,
    displayNumber,
    state: 'done',
  }
}

/**
 * WhatsApp AI intake: hybrid store resolve → agent+rules → optional clarify → ticket.
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
      const reply = await craftIntakeReply(
        WA_COPY.countryMissing,
        'intake_country_missing',
      )
      // Still try outbound so the reporter is not left without a reply.
      await sendWhatsAppText({
        toWaId: message.waId,
        text: reply,
        phoneNumberId:
          message.phoneNumberId ||
          process.env.WHATSAPP_PHONE_NUMBER_ID ||
          null,
        forceDryRun: options?.skipOutboundGraph === true,
        purpose: 'intake_reply',
      })
      return { ok: false, reply, error: 'country_missing' }
    }

    const isNew = await markProcessed(supabase, message.messageId, country.id)
    if (!isNew) {
      return { ok: true, duplicate: true, reply: null }
    }

    let session = await getOrCreateSession(supabase, country, message.waId)
    const text = message.text?.trim() || null

    await logWhatsAppMessage({
      supabase,
      country,
      session,
      waId: message.waId,
      direction: 'inbound',
      body: text,
      metaMessageId: message.messageId,
      mediaKind: message.mediaKind,
    })
    await updateSession(supabase, session, {
      last_inbound: text || (message.mediaUrl ? '[media]' : null),
    })

    // Human takeover: log only, bot silent
    if (session.human_takeover) {
      logEvent('whatsapp:intake', 'info', 'human_takeover_skip', {
        waId: message.waId,
      })
      return { ok: true, reply: null, state: session.state }
    }

    const storeCodeFromText = text ? parseStoreCodeFromText(text) : null
    let source = inferSourceFromText(text, message.sourceHint)

    // Photo (or other media) right after a ticket was opened → attach to that ticket.
    if (
      session.state === 'done' &&
      session.active_ticket_id &&
      message.mediaUrl &&
      !storeCodeFromText
    ) {
      return await attachMediaToActiveTicket({
        supabase,
        session,
        message,
        country,
        options,
      })
    }

    // Explicit new STORE_ after a completed ticket → start a fresh intake.
    if (session.state === 'done' && storeCodeFromText) {
      await updateSession(supabase, session, {
        store_id: null,
        store_code: null,
        state: 'awaiting_store',
        pending_description: null,
        draft_payload: null,
        active_ticket_id: null,
        clarification_count: 0,
      })
      session = {
        ...session,
        store_id: null,
        store_code: null,
        state: 'awaiting_store',
        pending_description: null,
        draft_payload: null,
        active_ticket_id: null,
        clarification_count: 0,
      }
    }

    // New text issue after a completed ticket, same store still known.
    if (
      session.state === 'done' &&
      session.store_id &&
      session.store_code &&
      text &&
      !storeCodeFromText &&
      !message.mediaUrl
    ) {
      await updateSession(supabase, session, {
        state: 'awaiting_description',
        active_ticket_id: null,
        pending_description: null,
        draft_payload: null,
        clarification_count: 0,
      })
      session = {
        ...session,
        state: 'awaiting_description',
        active_ticket_id: null,
        pending_description: null,
        draft_payload: null,
        clarification_count: 0,
      }
    }

    // Hybrid identity: known phone → store
    if ((!session.store_id || session.state === 'awaiting_store') && !storeCodeFromText) {
      const byPhone = await resolveStoreByWaId(
        supabase,
        message.waId,
        country.id,
      )
      if (byPhone) {
        await updateSession(supabase, session, {
          store_id: byPhone.id,
          store_code: byPhone.code,
          state: 'awaiting_description',
        })
        session = {
          ...session,
          store_id: byPhone.id,
          store_code: byPhone.code,
          state: 'awaiting_description',
        }
        if (!text && !message.mediaUrl) {
          const reply = await craftIntakeReply(
            WA_COPY.askDescription(byPhone.name, byPhone.code),
            'intake_ask_description',
          )
          await sendReply(supabase, message, country, reply, null, options, session)
          return { ok: true, reply, state: 'awaiting_description' }
        }
      }
    }

    if (storeCodeFromText) {
      const store = await resolveStoreByCode(
        supabase,
        country.id,
        storeCodeFromText,
      )
      if (!store) {
        const reply = await craftIntakeReply(
          WA_COPY.storeNotFound(storeCodeFromText),
          'intake_store_not_found',
        )
        await sendReply(supabase, message, country, reply, null, options, session)
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
      await linkStorePhone(supabase, country, message.waId, store)

      if (isIdentityOnly(text, store.code) && !message.mediaUrl) {
        const reply = await craftIntakeReply(
          WA_COPY.askDescription(store.name, store.code),
          'intake_ask_description',
        )
        await sendReply(supabase, message, country, reply, null, options, session)
        return { ok: true, reply, state: 'awaiting_description' }
      }

      const description =
        text && !isIdentityOnly(text, store.code)
          ? text.replace(/\bSTORE[_\s-]?\d{1,6}\b/i, '').trim() || text
          : text || ''
      if (description || message.mediaUrl) {
        return await analyzeAndFinalize({
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
      const reply = await craftIntakeReply(WA_COPY.askStore, 'intake_ask_store')
      await sendReply(supabase, message, country, reply, null, options, session)
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
      const reply = await craftIntakeReply(WA_COPY.askStore, 'intake_ask_store')
      await sendReply(supabase, message, country, reply, null, options, session)
      return { ok: true, reply, state: 'awaiting_store' }
    }

    // Clarification follow-up: merge answer with pending description
    if (session.state === 'awaiting_clarification') {
      const prior = session.pending_description || ''
      const answer = text || ''
      const combined = [prior, answer].filter(Boolean).join('\n').trim()
      if (!combined && !message.mediaUrl) {
        const q =
          (session.draft_payload?.clarificationQuestion as string) ||
          WA_COPY.needDescription
        const reply = await craftIntakeReply(q, 'intake_need_description')
        await sendReply(supabase, message, country, reply, null, options, session)
        return { ok: true, reply, state: 'awaiting_clarification' }
      }
      return await analyzeAndFinalize({
        supabase,
        session,
        store,
        description: combined || 'תמונה מצורפת',
        message,
        source,
        country,
        options,
        forceCreate: session.clarification_count >= 2,
      })
    }

    if (!text && !message.mediaUrl) {
      const reply = await craftIntakeReply(
        WA_COPY.needDescription,
        'intake_need_description',
      )
      await sendReply(supabase, message, country, reply, null, options, session)
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

    return await analyzeAndFinalize({
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
    logEvent('whatsapp:intake', 'error', 'intake_error', {
      error: e instanceof Error ? e.message : 'unknown',
    })
    const reply = await craftIntakeReply(
      WA_COPY.genericError,
      'intake_generic_error',
    )
    return {
      ok: false,
      reply,
      error: e instanceof Error ? e.message : 'intake_error',
    }
  }
}

async function analyzeAndFinalize(params: {
  supabase: SupabaseClient | null
  session: SessionRow
  store: StoreRow
  description: string
  message: InboundMessage
  source: TicketSource
  country: CountryRow
  options?: { skipOutboundGraph?: boolean }
  forceCreate?: boolean
}): Promise<IntakeResult> {
  const {
    supabase,
    session,
    store,
    description,
    message,
    source,
    country,
    options,
    forceCreate,
  } = params

  const decision = await runIntakeAgent({
    text: description,
    storeName: store.name,
    storeCode: store.code,
    hasMedia: Boolean(message.mediaUrl),
  })

  const canClarify =
    !forceCreate &&
    decision.needsClarification &&
    Boolean(decision.clarificationQuestion) &&
    session.clarification_count < 2

  if (canClarify) {
    const nextCount = session.clarification_count + 1
    await updateSession(supabase, session, {
      state: 'awaiting_clarification',
      pending_description: description,
      clarification_count: nextCount,
      draft_payload: {
        summary: decision.summary,
        category: decision.category,
        priority: decision.priority,
        clarificationQuestion: decision.clarificationQuestion,
        provider: decision.provider,
      },
    })
    const reply = decision.clarificationQuestion!
    await sendReply(supabase, message, country, reply, null, options, {
      ...session,
      clarification_count: nextCount,
      state: 'awaiting_clarification',
    })
    return { ok: true, reply, state: 'awaiting_clarification' }
  }

  return finalizeTicket({
    supabase,
    session,
    store,
    description,
    decision,
    message,
    source,
    country,
    options,
  })
}

async function finalizeTicket(params: {
  supabase: SupabaseClient | null
  session: SessionRow
  store: StoreRow
  description: string
  decision: IntakeDecision
  message: InboundMessage
  source: TicketSource
  country: CountryRow
  options?: { skipOutboundGraph?: boolean }
}): Promise<IntakeResult> {
  const {
    supabase,
    session,
    store,
    description,
    decision,
    message,
    source,
    country,
    options,
  } = params

  const dup = await findPossibleDuplicateTicket({
    supabase,
    storeId: store.id,
    summary: decision.summary || description,
    category: decision.category,
  })
  const duplicateHint = dup
    ? `ייתכן שקיימת תקלה דומה פתוחה ${dup.displayNumber || ''}`.trim()
    : decision.possibleDuplicateHint

  const { ticketId, displayNumber, mediaFailed } = await createTicketFromIntake({
    store,
    country,
    description,
    decision,
    mediaUrl: message.mediaUrl,
    mediaKind: message.mediaKind,
    waId: message.waId,
    messageId: message.messageId,
    source,
    inboundText: message.text,
    useMemory: !supabase,
  })

  await updateSession(supabase, session, {
    state: 'done',
    pending_description: null,
    draft_payload: null,
    active_ticket_id: ticketId,
    clarification_count: 0,
  })

  await linkStorePhone(supabase, country, message.waId, store)

  let reply = await craftIntakeReply(
    WA_COPY.confirmedIntake({
      displayNumber,
      storeCode: store.code,
      summary: decision.asset
        ? `${decision.asset} — ${decision.summary}`
        : decision.summary,
      priority: decision.priority,
      duplicateHint,
    }),
    'intake_confirmed',
  )
  if (mediaFailed) {
    reply = `${reply}\n\n${await craftIntakeReply(WA_COPY.mediaNotSaved, 'intake_media_not_saved')}`
  }
  await sendReply(supabase, message, country, reply, ticketId, options, session)

  logEvent('whatsapp:intake', 'info', 'ticket_created', {
    ticketId,
    displayNumber,
    category: decision.category,
    priority: decision.priority,
    provider: decision.provider,
  })

  return {
    ok: true,
    reply,
    ticketId,
    displayNumber,
    state: 'done',
  }
}

async function craftIntakeReply(
  baseText: string,
  situation: WhatsAppAiSituation,
): Promise<string> {
  return enhanceWhatsAppMessage(baseText, { situation })
}

async function sendReply(
  supabase: SupabaseClient | null,
  message: InboundMessage,
  country: CountryRow,
  reply: string,
  ticketId: string | null,
  options?: { skipOutboundGraph?: boolean },
  session?: SessionRow | null,
) {
  // Real Graph send whenever we have a DB session (supabase) OR production token.
  // Previously `!supabase` forced dry-run and silently dropped live replies.
  const forceDryRun = options?.skipOutboundGraph === true
  const result = await sendWhatsAppText({
    toWaId: message.waId,
    text: reply,
    phoneNumberId: message.phoneNumberId || country.whatsapp_phone_number_id,
    ticketId,
    supabase: ticketId && supabase ? supabase : undefined,
    forceDryRun,
    purpose: 'intake_reply',
  })
  if (!result.ok || result.dryRun) {
    logEvent('whatsapp:send', result.ok ? 'warn' : 'error', 'outbound_result', {
      ok: result.ok,
      dryRun: result.dryRun,
      error: result.error ?? null,
      to: message.waId,
      phoneNumberId: message.phoneNumberId || country.whatsapp_phone_number_id,
    })
  } else {
    logEvent('whatsapp:send', 'info', 'outbound_ok', {
      to: message.waId,
      waMessageId: result.waMessageId,
    })
  }
  await logWhatsAppMessage({
    supabase,
    country,
    session: session ?? null,
    waId: message.waId,
    direction: 'outbound',
    body: reply,
    metaMessageId: result.waMessageId,
    ticketId,
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
    phoneNumberId:
      process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      'wa_phone_il_demo',
    text: storePrefill,
    mediaUrl: input.mediaUrl || null,
    mediaKind: input.mediaUrl ? 'image' : null,
    timestamp: String(Math.floor(Date.now() / 1000)),
    sourceHint: input.source || (input.storeCode ? 'qr_whatsapp' : 'demo'),
  }

  return processInboundMessage(message, { skipOutboundGraph: true })
}
