import 'server-only'

import {
  memGet,
  memAddEvent,
  supabaseReady,
} from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { updateStatus, appendEvent, getById } from '@/modules/tickets/service'
import { notifyReporter } from '@/modules/notifications/lifecycle-notify'
import {
  isQualityHoldActive,
  formatQualityHoldHe,
} from '@/modules/tickets/quality-hold'

/**
 * Store staff confirms the fix.
 * B03: stamps store_confirmed_* immediately, but final close waits for
 * quality hold (30 days) unless Ari overrides via updateStatus.
 */
export async function confirmStoreFix(input: {
  ticketId: string
  actorLabel?: string | null
}): Promise<{
  id: string
  status: string
  store_confirmed_at: string
  quality_hold_until?: string | null
  pending_final_close?: boolean
}> {
  const now = new Date().toISOString()
  const actorLabel = input.actorLabel?.trim() || 'store'

  if (!(await supabaseReady())) {
    return confirmStoreFixMemoryFallback(input, now, actorLabel)
  }

  const supabase = createSystemClient('store_confirm')
  const { data: row, error } = await supabase
    .from('tickets')
    .select('id, status, store_confirmed_at, quality_hold_until')
    .eq('id', input.ticketId)
    .maybeSingle()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return confirmStoreFixMemoryFallback(input, now, actorLabel)
    }
    throw new Error(error.message)
  }
  if (!row) throw new Error('תקלה לא נמצאה')
  if (row.status === 'closed') {
    return {
      id: row.id,
      status: row.status,
      store_confirmed_at: (row.store_confirmed_at as string) ?? now,
      quality_hold_until: (row.quality_hold_until as string) ?? null,
    }
  }
  if (row.status !== 'resolved') {
    throw new Error('ניתן לאשר רק תקלה שנפתרה')
  }

  const { error: updErr } = await supabase
    .from('tickets')
    .update({
      store_confirmed_at: now,
      store_confirmed_by: actorLabel,
      updated_at: now,
    })
    .eq('id', input.ticketId)

  if (updErr) {
    if (isSupabaseSchemaError(updErr)) {
      return confirmStoreFixMemoryFallback(input, now, actorLabel)
    }
    throw new Error(updErr.message)
  }

  await appendEvent(input.ticketId, 'store_confirmed', null, { by: actorLabel })

  const holdUntil = (row.quality_hold_until as string | null) ?? null
  if (isQualityHoldActive(holdUntil, new Date(now))) {
    return {
      id: row.id,
      status: 'resolved',
      store_confirmed_at: now,
      quality_hold_until: holdUntil,
      pending_final_close: true,
    }
  }

  const closed = await updateStatus(input.ticketId, 'closed')
  const detail = await getById(closed.id)
  if (detail) await notifyReporter(detail, 'closed')

  return {
    id: closed.id,
    status: closed.status,
    store_confirmed_at: now,
    quality_hold_until: holdUntil,
  }
}

async function confirmStoreFixMemoryFallback(
  input: { ticketId: string; actorLabel?: string | null },
  now: string,
  actorLabel: string,
) {
  const ticket = memGet(input.ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  if (ticket.status === 'closed') {
    return {
      id: ticket.id,
      status: ticket.status,
      store_confirmed_at: ticket.store_confirmed_at ?? now,
      quality_hold_until: ticket.quality_hold_until ?? null,
    }
  }
  if (ticket.status !== 'resolved') {
    throw new Error('ניתן לאשר רק תקלה שנפתרה')
  }
  ticket.store_confirmed_at = now
  ticket.store_confirmed_by = actorLabel
  ticket.updated_at = now
  memAddEvent(ticket.id, 'store_confirmed', { by: actorLabel }, null)

  if (isQualityHoldActive(ticket.quality_hold_until, new Date(now))) {
    return {
      id: ticket.id,
      status: 'resolved',
      store_confirmed_at: now,
      quality_hold_until: ticket.quality_hold_until ?? null,
      pending_final_close: true,
    }
  }

  const closed = await updateStatus(ticket.id, 'closed')
  const detail = await getById(closed.id)
  if (detail) await notifyReporter(detail, 'closed')
  return {
    id: closed.id,
    status: closed.status,
    store_confirmed_at: now,
    quality_hold_until: ticket.quality_hold_until ?? null,
  }
}

/** Human-readable hold status for store/HQ UI. */
export function storeConfirmHoldMessage(
  holdUntil: string | null | undefined,
  now = new Date(),
): string | null {
  return formatQualityHoldHe(holdUntil, now)
}

export function storeConfirmUrl(ticketId: string): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
  return `${appUrl}/store/tickets/${ticketId}`
}

/**
 * Store reports the fix did not hold → back to in_progress.
 * Preserves ticket history (events/messages); only clears resolved_at via status transition.
 */
export async function rejectStoreFix(input: {
  ticketId: string
  actorLabel?: string | null
  reason?: string | null
}): Promise<{ id: string; status: string }> {
  const actorLabel = input.actorLabel?.trim() || 'store'
  const reason = input.reason?.trim() || 'לא נפתר — דיווח חנות בוואטסאפ'

  if (!(await supabaseReady())) {
    const ticket = memGet(input.ticketId)
    if (!ticket) throw new Error('תקלה לא נמצאה')
    if (ticket.status !== 'resolved') {
      throw new Error('ניתן לדווח «לא נפתר» רק על תקלה בסטטוס נפתרה')
    }
    memAddEvent(
      ticket.id,
      'store_rejected',
      { by: actorLabel, reason },
      null,
    )
    const reopened = await updateStatus(ticket.id, 'in_progress')
    return { id: reopened.id, status: reopened.status }
  }

  const supabase = createSystemClient('store_confirm')
  const { data: row, error } = await supabase
    .from('tickets')
    .select('id, status')
    .eq('id', input.ticketId)
    .maybeSingle()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return rejectStoreFixMemoryFallback(input, actorLabel, reason)
    }
    throw new Error(error.message)
  }
  if (!row) throw new Error('תקלה לא נמצאה')
  if (row.status !== 'resolved') {
    throw new Error('ניתן לדווח «לא נפתר» רק על תקלה בסטטוס נפתרה')
  }

  await appendEvent(input.ticketId, 'store_rejected', null, {
    by: actorLabel,
    reason,
  })
  const reopened = await updateStatus(input.ticketId, 'in_progress')
  return { id: reopened.id, status: reopened.status }
}

async function rejectStoreFixMemoryFallback(
  input: { ticketId: string; actorLabel?: string | null; reason?: string | null },
  actorLabel: string,
  reason: string,
) {
  const ticket = memGet(input.ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  if (ticket.status !== 'resolved') {
    throw new Error('ניתן לדווח «לא נפתר» רק על תקלה בסטטוס נפתרה')
  }
  memAddEvent(ticket.id, 'store_rejected', { by: actorLabel, reason }, null)
  const reopened = await updateStatus(ticket.id, 'in_progress')
  return { id: reopened.id, status: reopened.status }
}

export {
  STORE_CONFIRM_BUTTON_PREFIX,
  STORE_CONFIRM_BUTTON_TITLE,
  STORE_CONFIRM_WA_HINT,
  STORE_REJECT_BUTTON_PREFIX,
  STORE_REJECT_BUTTON_TITLE,
  isStoreConfirmReply,
  isStoreRejectReply,
  parseStoreConfirmButtonId,
  parseStoreRejectButtonId,
  storeConfirmButtonId,
  storeRejectButtonId,
  formatAwaitingConfirmChoice,
} from './wa-store-confirm'
