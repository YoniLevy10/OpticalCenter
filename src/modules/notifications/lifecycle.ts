import { logEvent } from '@/lib/logging'
import { memAddMessage, supabaseReady } from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { sendWhatsAppText } from '@/modules/whatsapp/send'
import type { OutboundPurpose } from '@/modules/whatsapp/cost-policy'

export type LifecycleEvent =
  | 'assigned'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'closed'

export type LifecycleTicket = {
  id: string
  display_number?: string | null
  number?: number | null
  reporter_phone?: string | null
  status?: string | null
  stores?: { name?: string | null; code?: string | null } | null
  assignee?: { full_name?: string | null } | null
}

const LIFECYCLE_EVENTS = new Set<LifecycleEvent>([
  'assigned',
  'in_progress',
  'waiting_parts',
  'resolved',
  'closed',
])

/** Pure Hebrew templates for store reporter lifecycle updates. */
export function lifecycleTemplate(
  event: LifecycleEvent,
  ticket: LifecycleTicket,
): string {
  const display =
    ticket.display_number ||
    (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
  const storeName = ticket.stores?.name?.trim() || 'החנות'
  const techName = ticket.assignee?.full_name?.trim() || 'טכנאי'

  switch (event) {
    case 'assigned':
      return `טכנאי הוקצה לתקלה ${display} בחנות ${storeName}.\nשם הטכנאי: ${techName}`
    case 'in_progress':
      return `הטכנאי התחיל טיפול בתקלה ${display}.`
    case 'waiting_parts':
      return `ממתינים לחלקים לתקלה ${display} — עדכון יישלח.`
    case 'resolved':
      return `התקלה ${display} טופלה. תודה!`
    case 'closed':
      return `התקלה ${display} נסגרה.`
  }
}

export function isLifecycleEvent(value: string): value is LifecycleEvent {
  return LIFECYCLE_EVENTS.has(value as LifecycleEvent)
}

async function persistOutbound(
  ticketId: string,
  body: string,
  waMessageId: string | null,
  meta: Record<string, unknown>,
) {
  if (await supabaseReady()) {
    const supabase = createSystemClient('lifecycle_notify')
    await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      channel: 'whatsapp',
      direction: 'outbound',
      body,
      wa_message_id: waMessageId,
      raw: meta,
    })
    return
  }
  memAddMessage(ticketId, {
    channel: 'whatsapp',
    direction: 'outbound',
    body,
    wa_message_id: waMessageId,
  })
}

/**
 * Notify the store reporter about a lifecycle change.
 * Never throws — failures are logged so mutations are not blocked.
 */
export async function notifyReporter(
  ticket: LifecycleTicket,
  event: LifecycleEvent | string,
  opts?: { phoneNumberId?: string | null; purpose?: OutboundPurpose },
): Promise<{ sent: boolean; skipped?: string }> {
  try {
    if (!isLifecycleEvent(event)) {
      return { sent: false, skipped: 'not_lifecycle_event' }
    }

    const phone = ticket.reporter_phone?.replace(/\D/g, '') || null
    if (!phone) {
      logEvent('lifecycle:notify', 'info', 'no_reporter_phone', {
        ticketId: ticket.id,
        event,
      })
      return { sent: false, skipped: 'no_reporter_phone' }
    }

    const text = lifecycleTemplate(event, ticket)
    const purpose = opts?.purpose ?? 'status_update'
    const ready = await supabaseReady()
    const supabase = ready ? createSystemClient('lifecycle_notify') : undefined

    const result = await sendWhatsAppText({
      toWaId: phone,
      text,
      phoneNumberId: opts?.phoneNumberId,
      ticketId: ticket.id,
      // send.ts persists only when supabase is set; we also persist below for memory.
      supabase: supabase && ready ? supabase : undefined,
      forceDryRun: !ready,
      purpose,
    })

    if (result.skippedByPolicy) {
      return { sent: false, skipped: 'cost_policy' }
    }

    // Memory path: send.ts only persists when supabase is set.
    if (!ready || !supabase) {
      await persistOutbound(ticket.id, text, result.waMessageId, {
        event,
        dryRun: result.dryRun,
        ok: result.ok,
        purpose,
      })
    }

    return { sent: result.ok }
  } catch (e) {
    logEvent('lifecycle:notify', 'error', 'notify_failed', {
      ticketId: ticket.id,
      event,
      error: e instanceof Error ? e.message : String(e),
    })
    return { sent: false, skipped: 'error' }
  }
}

/**
 * Notify assigned technician via WhatsApp with a deep link to the tech job.
 */
export async function notifyTechnicianAssigned(
  ticket: LifecycleTicket & { assigned_to?: string | null },
  tech: { id: string; full_name?: string | null; phone?: string | null } | null,
): Promise<{ sent: boolean; skipped?: string }> {
  try {
    const phone = tech?.phone?.replace(/\D/g, '') || null
    if (!phone) {
      logEvent('lifecycle:tech_notify', 'info', 'no_tech_phone', {
        ticketId: ticket.id,
        techId: tech?.id ?? ticket.assigned_to ?? null,
      })
      return { sent: false, skipped: 'no_tech_phone' }
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '')
    const display =
      ticket.display_number ||
      (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
    const storeName = ticket.stores?.name?.trim() || 'חנות'
    const link = `${appUrl}/tech/${ticket.id}`
    const text = `שיוכת לתקלה ${display} בחנות ${storeName}.\nלפתיחה: ${link}`

    const ready = await supabaseReady()
    const supabase = ready ? createSystemClient('tech_assign_notify') : undefined

    const result = await sendWhatsAppText({
      toWaId: phone,
      text,
      ticketId: ticket.id,
      supabase: supabase && ready ? supabase : undefined,
      forceDryRun: !ready,
      purpose: 'status_update',
    })

    if (result.skippedByPolicy) {
      return { sent: false, skipped: 'cost_policy' }
    }

    if (!ready || !supabase) {
      await persistOutbound(ticket.id, text, result.waMessageId, {
        event: 'tech_assigned',
        dryRun: result.dryRun,
        ok: result.ok,
      })
    }

    return { sent: result.ok }
  } catch (e) {
    logEvent('lifecycle:tech_notify', 'error', 'notify_failed', {
      ticketId: ticket.id,
      error: e instanceof Error ? e.message : String(e),
    })
    return { sent: false, skipped: 'error' }
  }
}
