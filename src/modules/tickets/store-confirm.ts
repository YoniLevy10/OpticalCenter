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

/**
 * Store staff confirms the fix → ticket closes without Ari chasing.
 * HQ may still force-close from resolved without confirmation.
 */
export async function confirmStoreFix(input: {
  ticketId: string
  actorLabel?: string | null
}): Promise<{ id: string; status: string; store_confirmed_at: string }> {
  const now = new Date().toISOString()
  const actorLabel = input.actorLabel?.trim() || 'store'

  if (!(await supabaseReady())) {
    const ticket = memGet(input.ticketId)
    if (!ticket) throw new Error('תקלה לא נמצאה')
    if (ticket.status === 'closed') {
      return {
        id: ticket.id,
        status: ticket.status,
        store_confirmed_at: ticket.store_confirmed_at ?? now,
      }
    }
    if (ticket.status !== 'resolved') {
      throw new Error('ניתן לאשר רק תקלה שנפתרה')
    }
    ticket.store_confirmed_at = now
    ticket.store_confirmed_by = actorLabel
    ticket.updated_at = now
    memAddEvent(ticket.id, 'store_confirmed', { by: actorLabel }, null)
    const closed = await updateStatus(ticket.id, 'closed')
    const detail = await getById(closed.id)
    if (detail) await notifyReporter(detail, 'closed')
    return {
      id: closed.id,
      status: closed.status,
      store_confirmed_at: now,
    }
  }

  const supabase = createSystemClient('store_confirm')
  const { data: row, error } = await supabase
    .from('tickets')
    .select('id, status, store_confirmed_at')
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
  const closed = await updateStatus(input.ticketId, 'closed')
  const detail = await getById(closed.id)
  if (detail) await notifyReporter(detail, 'closed')

  return {
    id: closed.id,
    status: closed.status,
    store_confirmed_at: now,
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
    }
  }
  if (ticket.status !== 'resolved') {
    throw new Error('ניתן לאשר רק תקלה שנפתרה')
  }
  ticket.store_confirmed_at = now
  ticket.store_confirmed_by = actorLabel
  ticket.updated_at = now
  memAddEvent(ticket.id, 'store_confirmed', { by: actorLabel }, null)
  const closed = await updateStatus(ticket.id, 'closed')
  return {
    id: closed.id,
    status: closed.status,
    store_confirmed_at: now,
  }
}

export function storeConfirmUrl(ticketId: string): string {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
  return `${appUrl}/store/tickets/${ticketId}`
}
