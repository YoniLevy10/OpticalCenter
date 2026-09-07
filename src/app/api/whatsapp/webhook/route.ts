import { NextRequest, NextResponse } from 'next/server'
import {
  parseWhatsAppWebhook,
  processInboundMessage,
  verifyWhatsAppSignature,
} from '@/modules/whatsapp'
import { captureError } from '@/lib/monitoring'
import { logEvent } from '@/lib/logging'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Process intake + Graph reply inside the request.
 * Do NOT defer with `after()` — on Vercel that continuation often never
 * finishes after Meta already got 200, so the bot "receives" but never replies.
 */
export const maxDuration = 60

const WEBHOOK_RATE_LIMIT = 60
const WEBHOOK_RATE_WINDOW_MS = 60_000

/** Meta webhook verification (hub.challenge). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const mode = sp.get('hub.mode')
  const token = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')
  const expected =
    process.env.WHATSAPP_VERIFY_TOKEN || process.env.WA_VERIFY_TOKEN

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

/**
 * Inbound WhatsApp messages — verify, process, reply, then 200.
 * Meta allows ~15–20s; AI calls are capped (~12s) so this fits maxDuration.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request)
  const rl = checkRateLimit(`wa:webhook:${ip}`, WEBHOOK_RATE_LIMIT, WEBHOOK_RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rl.resetMs / 1000) || 1),
        },
      },
    )
  }

  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifyWhatsAppSignature(rawBody, signature)) {
      console.warn('[whatsapp:webhook] invalid signature')
      return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 200 })
    }

    const messages = parseWhatsAppWebhook(body)
    logEvent('whatsapp:webhook', 'info', 'accepted', {
      messageCount: messages.length,
      hasSignature: Boolean(signature),
    })
    console.info(
      '[whatsapp:webhook] accepted',
      JSON.stringify({ messageCount: messages.length }),
    )
    if (messages.length === 0) {
      return NextResponse.json({ ok: true, accepted: 0 }, { status: 200 })
    }

    const results = []
    for (const msg of messages) {
      try {
        const result = await processInboundMessage(msg)
        const summary = {
          messageId: msg.messageId,
          waId: msg.waId,
          ok: result.ok,
          duplicate: result.duplicate ?? false,
          ticketId: result.ticketId ?? null,
          state: result.state ?? null,
          hasReply: Boolean(result.reply),
          error: result.error ?? null,
        }
        results.push(summary)
        logEvent('whatsapp:webhook', 'info', 'processed', summary)
        console.info('[whatsapp:webhook] processed', JSON.stringify(summary))
      } catch (e) {
        captureError(e, {
          route: 'POST /api/whatsapp/webhook',
          messageId: msg.messageId,
        })
        const error = e instanceof Error ? e.message : 'unknown'
        logEvent('whatsapp:webhook', 'error', 'process_failed', {
          messageId: msg.messageId,
          error,
        })
        console.error('[whatsapp:webhook] process_failed', error)
        results.push({
          messageId: msg.messageId,
          ok: false,
          error,
        })
      }
    }

    return NextResponse.json(
      { ok: true, processed: results.length, results },
      { status: 200 },
    )
  } catch (e) {
    captureError(e, { route: 'POST /api/whatsapp/webhook' })
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'error' },
      { status: 200 },
    )
  }
}
