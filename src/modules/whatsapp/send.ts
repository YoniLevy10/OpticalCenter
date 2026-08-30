import type { SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/logging'
import { shouldSendWhatsApp, type OutboundPurpose } from './cost-policy'
import {
  normalizeWhatsAppRecipient,
  resolveWhatsAppPhoneNumberId,
} from './phone-number-id'

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

export type SendWhatsAppResult = {
  ok: boolean
  dryRun: boolean
  waMessageId: string | null
  error?: string
  errorCode?: number | null
  errorSubcode?: number | null
  fbtraceId?: string | null
  phoneNumberId?: string | null
  toWaId?: string
  skippedByPolicy?: boolean
}

type GraphErrorBody = {
  messages?: Array<{ id?: string }>
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

function hebrewGraphError(json: GraphErrorBody, status: number): string {
  const code = json.error?.code
  const sub = json.error?.error_subcode
  const msg = json.error?.message || `Graph API ${status}`

  // Outside 24h customer-care window / template required
  if (
    code === 131047 ||
    code === 131026 ||
    sub === 2018034 ||
    /24\s*hour|outside.*window|template/i.test(msg)
  ) {
    return (
      'חלון 24 השעות של WhatsApp פג — נדרשת הודעת תבנית (template) מאושרת. ' +
      `(${msg})`
    )
  }
  if (code === 190 || status === 401) {
    return `טוקן WhatsApp לא תקף או חסר הרשאה (${msg})`
  }
  if (code === 100 || status === 400) {
    return `בקשת WhatsApp נדחתה על ידי Meta (${msg})`
  }
  return msg
}

/**
 * Outbound WhatsApp send via Meta Graph API.
 * - Live purposes (ops_reply, etc.) fail clearly when token / phoneNumberId missing.
 * - forceDryRun / missing config for non-live paths may dry-run.
 * Never logs the access token.
 */
export async function sendWhatsAppText(
  params: SendWhatsAppParams,
): Promise<SendWhatsAppResult> {
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

  const toWaId = normalizeWhatsAppRecipient(params.toWaId)
  const token = params.forceDryRun
    ? null
    : process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null
  const phoneNumberId = resolveWhatsAppPhoneNumberId(params.phoneNumberId)

  const requireLive =
    purpose === 'ops_reply' ||
    purpose === 'status_update' ||
    purpose === 'ticket_confirmation'

  if (!params.forceDryRun && requireLive) {
    if (!token) {
      return {
        ok: false,
        dryRun: false,
        waMessageId: null,
        error:
          'חסר WHATSAPP_ACCESS_TOKEN בסביבת הפרודקשן — לא ניתן לשלוח תשובה ללקוח',
        phoneNumberId,
        toWaId,
      }
    }
    if (!phoneNumberId) {
      return {
        ok: false,
        dryRun: false,
        waMessageId: null,
        error:
          'חסר Phone Number ID תקין של Meta (WHATSAPP_PHONE_NUMBER_ID או countries.whatsapp_phone_number_id). ערכי demo לא נשלחים.',
        phoneNumberId,
        toWaId,
      }
    }
  }

  let waMessageId: string | null = null
  let dryRun = true
  let ok = true
  let error: string | undefined
  let errorCode: number | null = null
  let errorSubcode: number | null = null
  let fbtraceId: string | null = null

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
              recipient_type: 'individual',
              to: toWaId,
              type: 'text',
              text: { body: params.text, preview_url: false },
            }),
          },
        )
        const json = (await res.json()) as GraphErrorBody
        if (res.ok) {
          ok = true
          error = undefined
          errorCode = null
          errorSubcode = null
          fbtraceId = null
          waMessageId = json.messages?.[0]?.id ?? null
          logEvent('whatsapp:send', 'info', 'graph_ok', {
            to: toWaId,
            phoneNumberId,
            waMessageId,
            purpose,
          })
          break
        }
        const retryable = res.status === 429 || res.status >= 500
        errorCode = json.error?.code ?? null
        errorSubcode = json.error?.error_subcode ?? null
        fbtraceId = json.error?.fbtrace_id ?? null
        error = hebrewGraphError(json, res.status)
        ok = false
        console.error('[whatsapp:send] Graph API failed', {
          status: res.status,
          code: errorCode,
          error_subcode: errorSubcode,
          type: json.error?.type ?? null,
          message: json.error?.message ?? null,
          fbtrace_id: fbtraceId,
          phoneNumberId,
          to: toWaId,
          attempt,
        })
        logEvent('whatsapp:send', 'error', 'graph_failed', {
          status: res.status,
          code: errorCode,
          error_subcode: errorSubcode,
          type: json.error?.type ?? null,
          error,
          fbtrace_id: fbtraceId,
          phoneNumberId,
          to: toWaId,
          attempt,
        })
        if (!retryable || attempt === maxAttempts) break
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
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
      to: toWaId,
      phoneNumberId,
      purpose,
      hasToken: Boolean(token),
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
      raw: {
        dryRun,
        ok,
        error: error ?? null,
        errorCode,
        errorSubcode,
        fbtraceId,
        purpose,
        phoneNumberId,
        to: toWaId,
      },
    })
  }

  return {
    ok,
    dryRun,
    waMessageId,
    error,
    errorCode,
    errorSubcode,
    fbtraceId,
    phoneNumberId,
    toWaId,
  }
}
