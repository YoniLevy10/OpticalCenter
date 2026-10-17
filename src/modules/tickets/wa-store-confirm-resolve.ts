/**
 * Resolve which ticket a store confirm/reject WA action applies to.
 * Webhook signature proves Meta delivery — not that this sender may act on the ticket.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  memGet,
  memListTickets,
  memResolveStoreByWaId,
} from '@/lib/data/memory-store'
import { normalizePhoneDigits } from '@/lib/phone'
import { logEvent } from '@/lib/logging'
import {
  parseStoreConfirmButtonId,
  parseStoreRejectButtonId,
  reporterPhoneMatches,
} from '@/modules/tickets/wa-store-confirm'

async function resolveLinkedStoreId(
  supabase: SupabaseClient | null,
  waId: string,
): Promise<string | null> {
  if (!waId) return null
  if (!supabase) {
    return memResolveStoreByWaId(waId, null)?.id ?? null
  }
  const { data } = await supabase
    .from('store_phones')
    .select('store_id')
    .eq('wa_id', waId)
    .limit(1)
    .maybeSingle()
  return (data?.store_id as string | null | undefined) ?? null
}

export type AwaitingConfirmTicket = {
  id: string
  display: string
  store_id: string | null
  reporter_phone: string | null
  updated_at: string
}

export type StoreConfirmResolve =
  | { outcome: 'ok'; ticketId: string }
  | { outcome: 'ambiguous'; tickets: AwaitingConfirmTicket[] }
  | { outcome: 'unauthorized' }
  | { outcome: 'none' }
  /** Supabase was expected but the identity-scoped query failed — never fall to demo memory. */
  | { outcome: 'unavailable' }

function phoneTail(waId: string): string {
  const digits = normalizePhoneDigits(waId) || waId.replace(/\D/g, '')
  return digits.slice(-9)
}

function displayFor(row: {
  id: string
  display_number?: string | null
  number?: number | null
}): string {
  if (row.display_number) return row.display_number
  if (row.number != null) return `OC-${row.number}`
  return row.id.slice(0, 8)
}

function memAwaitingForSender(waId: string): AwaitingConfirmTicket[] {
  const linked = memResolveStoreByWaId(waId, null)
  return memListTickets()
    .filter((ticket) => {
      if (ticket.status !== 'resolved') return false
      if (ticket.store_confirmed_at) return false
      if (reporterPhoneMatches(waId, ticket.reporter_phone)) return true
      if (linked && ticket.store_id === linked.id) return true
      return false
    })
    .map((ticket) => ({
      id: ticket.id,
      display: displayFor(ticket),
      store_id: ticket.store_id,
      reporter_phone: ticket.reporter_phone,
      updated_at: ticket.updated_at,
    }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
}

export async function senderAuthorizedForTicket(input: {
  waId: string
  ticketId: string
  storeId: string | null | undefined
  reporterPhone: string | null | undefined
  supabase: SupabaseClient | null
}): Promise<boolean> {
  if (reporterPhoneMatches(input.waId, input.reporterPhone)) return true

  if (!input.storeId) return false

  const linkedStoreId = await resolveLinkedStoreId(input.supabase, input.waId)
  return Boolean(linkedStoreId && linkedStoreId === input.storeId)
}

async function loadTicketAuthFields(
  ticketId: string,
  supabase: SupabaseClient | null,
): Promise<{
  id: string
  status: string
  store_id: string | null
  reporter_phone: string | null
  store_confirmed_at: string | null
  display: string
} | null> {
  if (!supabase) {
    const ticket = memGet(ticketId)
    if (!ticket) return null
    return {
      id: ticket.id,
      status: ticket.status,
      store_id: ticket.store_id,
      reporter_phone: ticket.reporter_phone,
      store_confirmed_at: ticket.store_confirmed_at,
      display: displayFor(ticket),
    }
  }

  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id, status, store_id, reporter_phone, store_confirmed_at, display_number, number',
    )
    .eq('id', ticketId)
    .maybeSingle()

  if (error) {
    logEvent('whatsapp:store_confirm', 'warn', 'ticket_auth_lookup_failed', {
      ticketId,
      error: error.message,
    })
    return null
  }
  if (!data) return null
  return {
    id: data.id as string,
    status: data.status as string,
    store_id: (data.store_id as string | null) ?? null,
    reporter_phone: (data.reporter_phone as string | null) ?? null,
    store_confirmed_at: (data.store_confirmed_at as string | null) ?? null,
    display: displayFor({
      id: data.id as string,
      display_number: data.display_number as string | null,
      number: data.number as number | null,
    }),
  }
}

/**
 * Identity-scoped search for resolved tickets awaiting store confirm.
 * Filters in DB by reporter phone and/or authorized store — never loads a global window then filters.
 */
export async function listAwaitingStoreConfirm(input: {
  waId: string
  supabase: SupabaseClient | null
}): Promise<
  | { ok: true; tickets: AwaitingConfirmTicket[] }
  | { ok: false; reason: 'unavailable' | 'no_identity' }
> {
  if (!input.supabase) {
    return { ok: true, tickets: memAwaitingForSender(input.waId) }
  }

  const digits = normalizePhoneDigits(input.waId)
  const tail = phoneTail(input.waId)
  if (!digits && !tail) {
    return { ok: false, reason: 'no_identity' }
  }

  let storeId: string | null = null
  try {
    storeId = await resolveLinkedStoreId(input.supabase, input.waId)
  } catch (e) {
    logEvent('whatsapp:store_confirm', 'warn', 'store_phone_lookup_failed', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const phoneClauses: string[] = []
  if (digits) phoneClauses.push(`reporter_phone.eq.${digits}`)
  if (tail && tail.length >= 8) {
    phoneClauses.push(`reporter_phone.ilike.%${tail}`)
  }
  // Common local storage form 05…
  if (digits?.startsWith('972') && digits.length >= 12) {
    phoneClauses.push(`reporter_phone.eq.0${digits.slice(3)}`)
  }

  const orParts = [...phoneClauses]
  if (storeId) orParts.push(`store_id.eq.${storeId}`)

  if (orParts.length === 0) {
    return { ok: false, reason: 'no_identity' }
  }

  const { data, error } = await input.supabase
    .from('tickets')
    .select(
      'id, status, store_id, reporter_phone, store_confirmed_at, display_number, number, updated_at',
    )
    .eq('status', 'resolved')
    .is('store_confirmed_at', null)
    .or(orParts.join(','))
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error) {
    logEvent('whatsapp:store_confirm', 'warn', 'awaiting_confirm_query_failed', {
      error: error.message,
    })
    return { ok: false, reason: 'unavailable' }
  }

  const tickets = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      display: displayFor({
        id: row.id as string,
        display_number: row.display_number as string | null,
        number: row.number as number | null,
      }),
      store_id: (row.store_id as string | null) ?? null,
      reporter_phone: (row.reporter_phone as string | null) ?? null,
      updated_at: (row.updated_at as string) ?? '',
    }))
    // Defense in depth: PostgREST or-filter is broad; re-check sender auth.
    .filter((row) => {
      if (reporterPhoneMatches(input.waId, row.reporter_phone)) return true
      return Boolean(storeId && row.store_id === storeId)
    })

  return { ok: true, tickets }
}

async function authorizeBoundTicket(input: {
  waId: string
  ticketId: string
  supabase: SupabaseClient | null
  requireResolved: boolean
}): Promise<StoreConfirmResolve> {
  const ticket = await loadTicketAuthFields(input.ticketId, input.supabase)
  if (!ticket) {
    // Missing row under supabase → treat as unavailable (do not invent from memory).
    if (input.supabase) return { outcome: 'unavailable' }
    return { outcome: 'none' }
  }

  const allowed = await senderAuthorizedForTicket({
    waId: input.waId,
    ticketId: ticket.id,
    storeId: ticket.store_id,
    reporterPhone: ticket.reporter_phone,
    supabase: input.supabase,
  })
  if (!allowed) return { outcome: 'unauthorized' }

  if (input.requireResolved) {
    if (ticket.status !== 'resolved' || ticket.store_confirmed_at) {
      return { outcome: 'none' }
    }
  }

  return { outcome: 'ok', ticketId: ticket.id }
}

/**
 * Resolve confirm/reject target for a WA inbound.
 * - Button id binds to a specific ticket (after sender authorization).
 * - Free text: only when exactly one authorized ticket awaits confirm.
 * - Multiple → ambiguous (never auto-pick latest).
 * - DB failure with supabase → unavailable (no memory demo fallback).
 */
export async function resolveStoreConfirmTarget(input: {
  interactiveId?: string | null
  waId: string
  supabase: SupabaseClient | null
  /** confirm | reject — both require resolved + authorized */
  mode?: 'confirm' | 'reject'
}): Promise<StoreConfirmResolve> {
  const fromButton =
    parseStoreConfirmButtonId(input.interactiveId) ??
    parseStoreRejectButtonId(input.interactiveId)

  if (fromButton) {
    return authorizeBoundTicket({
      waId: input.waId,
      ticketId: fromButton,
      supabase: input.supabase,
      requireResolved: true,
    })
  }

  const listed = await listAwaitingStoreConfirm({
    waId: input.waId,
    supabase: input.supabase,
  })
  if (!listed.ok) {
    return listed.reason === 'unavailable'
      ? { outcome: 'unavailable' }
      : { outcome: 'none' }
  }

  if (listed.tickets.length === 0) return { outcome: 'none' }
  if (listed.tickets.length > 1) {
    return { outcome: 'ambiguous', tickets: listed.tickets }
  }
  return { outcome: 'ok', ticketId: listed.tickets[0]!.id }
}
