import type { SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/logging'
import { shouldSendWhatsApp, type OutboundPurpose } from './cost-policy'

export type SendWhatsAppParams = {
  toWaId: string
  text: string
  phoneNumberId?: string | null
  /** When set, also persist outbound row on the ticket. */
  ticketId?: string | null
  supabase?: SupabaseClient
  /** Force dry-run (simulator / tests) even if access token is present. */
  forceDryRun?: boolean
  purpose?: OutboundPurpose
}

/**
 * Outbound stub: real Graph API send when WHATSAPP_ACCESS_TOKEN is set, else dry-run.
 * Always stores confirmation text on ticket_messages when ticketId is provided.
 */
export async function sendWhatsAppText(params: SendWhatsAppParams): Promise<{
  ok: boolean
  dryRun: boolean
  waMessageId: string | null
  error?: string
  skippedByPolicy?: boolean
}> {
  const purpose = params.purpose ?? 'intake_reply'
  if (!shouldSendWhatsApp(purpose)) {
    logEvent('whatsapp:send', 'info', 'skipped_by_cost_policy', { purpose })
    return {
      ok: true,
      dryRun: true,
      waMessageId: null,
      skippedByPolicy: true,
    }
  }

  const token = params.forceDryRun ? null : process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId =
    params.phoneNumberId ||
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    null

  let waMessageId: string | null = null
  let dryRun = true
  let ok = true
  let error: string | undefined

  if (token && phoneNumberId) {
    dryRun = false
    const maxAttempts = 4
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: params.toWaId,
              type: 'text',
              text: { body: params.text },
            }),
          },
        )
        const json = (await res.json()) as {
          messages?: Array<{ id?: string }>
          error?: { message?: string; code?: number }
        }
        if (res.ok) {
          ok = true
          error = undefined
          waMessageId = json.messages?.[0]?.id ?? null
          logEvent('whatsapp:send', 'info', 'graph_ok', {
            to: params.toWaId,
            phoneNumberId,
            waMessageId,
          })
          break
        }
        const retryable = res.status === 429 || res.status >= 500
        error = json.error?.message || `Graph API ${res.status}`
        ok = false
        console.error('[whatsapp:send] Graph API failed', {
          status: res.status,
          error,
          phoneNumberId,
          to: params.toWaId,
          attempt,
        })
        logEvent('whatsapp:send', 'error', 'graph_failed', {
          status: res.status,
          error,
          phoneNumberId,
          to: params.toWaId,
          attempt,
        })
        if (!retryable || attempt === maxAttempts) break
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
        logEvent('whatsapp:send', 'warn', 'retry', {
          attempt,
          status: res.status,
          backoffMs,
        })
        await new Promise((r) => setTimeout(r, backoffMs))
      } catch (e) {
        ok = false
        error = e instanceof Error ? e.message : 'send failed'
        if (attempt === maxAttempts) break
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  } else {
    logEvent('whatsapp:send', 'info', 'dry_run', {
      to: params.toWaId,
      phoneNumberId,
    })
    waMessageId = `dryrun_${Date.now()}`
  }

  if (params.ticketId && params.supabase) {
    await params.supabase.from('ticket_messages').insert({
      ticket_id: params.ticketId,
      channel: 'whatsapp',
      direction: 'outbound',
      body: params.text,
      wa_message_id: waMessageId,
      raw: { dryRun, ok, error: error ?? null, purpose },
    })
  }

  return { ok, dryRun, waMessageId, error }
}
