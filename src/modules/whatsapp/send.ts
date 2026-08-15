import type { SupabaseClient } from '@supabase/supabase-js'

export type SendWhatsAppParams = {
  toWaId: string
  text: string
  phoneNumberId?: string | null
  /** When set, also persist outbound row on the ticket. */
  ticketId?: string | null
  supabase?: SupabaseClient
  /** Force dry-run (simulator / tests) even if access token is present. */
  forceDryRun?: boolean
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
}> {
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
        error?: { message?: string }
      }
      if (!res.ok) {
        ok = false
        error = json.error?.message || `Graph API ${res.status}`
      } else {
        waMessageId = json.messages?.[0]?.id ?? null
      }
    } catch (e) {
      ok = false
      error = e instanceof Error ? e.message : 'send failed'
    }
  } else {
    console.info('[whatsapp:dry-run]', {
      to: params.toWaId,
      phoneNumberId,
      text: params.text,
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
      raw: { dryRun, ok, error: error ?? null },
    })
  }

  return { ok, dryRun, waMessageId, error }
}
