import 'server-only'

import { logEvent } from '@/lib/logging'
import { memAddMessage, supabaseReady } from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { sendWhatsAppText } from '@/modules/whatsapp/send'
import {
  enhanceWhatsAppMessage,
  type WhatsAppAiSituation,
} from '@/modules/whatsapp/ai'
import type { OutboundPurpose } from '@/modules/whatsapp/cost-policy'
import { normalizePhoneDigits } from '@/lib/phone'
import {
  isLifecycleEvent,
  lifecycleTemplate,
  type LifecycleEvent,
  type LifecycleTicket,
} from './lifecycle'

const LIFECYCLE_AI_SITUATION: Record<LifecycleEvent, WhatsAppAiSituation> = {
  assigned: 'lifecycle_assigned',
  in_progress: 'lifecycle_in_progress',
  waiting_parts: 'lifecycle_waiting_parts',
  resolved: 'lifecycle_resolved',
  closed: 'lifecycle_closed',
}

/** AI-enhanced lifecycle message; falls back to template when AI is off. */
export async function buildLifecycleMessage(
  event: LifecycleEvent,
  ticket: LifecycleTicket,
): Promise<string> {
  const base = lifecycleTemplate(event, ticket)
  return enhanceWhatsAppMessage(base, {
    situation: LIFECYCLE_AI_SITUATION[event],
  })
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

    const phone = ticket.reporter_phone
      ? normalizePhoneDigits(ticket.reporter_phone)
      : null
    if (!phone) {
      logEvent('lifecycle:notify', 'info', 'no_reporter_phone', {
        ticketId: ticket.id,
        event,
      })
      return { sent: false, skipped: 'no_reporter_phone' }
    }

    const text = await buildLifecycleMessage(event, ticket)
    const purpose = opts?.purpose ?? 'status_update'
    const ready = await supabaseReady()
    const supabase = ready ? createSystemClient('lifecycle_notify') : undefined

    const result = await sendWhatsAppText({
      toWaId: phone,
      text,
      phoneNumberId: opts?.phoneNumberId,
      ticketId: ticket.id,
      supabase: supabase && ready ? supabase : undefined,
      forceDryRun: !ready,
      purpose,
    })

    if (result.skippedByPolicy) {
      return { sent: false, skipped: 'cost_policy' }
    }

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
    const phone = tech?.phone ? normalizePhoneDigits(tech.phone) : null
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
    const baseText = `שיוכת לתקלה ${display} בחנות ${storeName}.\nלפתיחה: ${link}`
    const text = await enhanceWhatsAppMessage(baseText, {
      situation: 'lifecycle_tech_assigned',
    })

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
