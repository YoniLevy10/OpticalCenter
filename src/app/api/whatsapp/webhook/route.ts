import { NextRequest, NextResponse } from 'next/server'
import {
  parseWhatsAppWebhook,
  processInboundMessage,
  verifyWhatsAppSignature,
} from '@/modules/whatsapp'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
 * Inbound WhatsApp messages.
 * Always 200 so Meta does not retry storms; errors are logged.
 * Signature required in production-like mode; optional only in explicit dev/demo bypass.
 * Rate limited to ~60 req/min per IP (in-memory).
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
    const results = []
    for (const msg of messages) {
      const result = await processInboundMessage(msg)
      results.push({
        messageId: msg.messageId,
        ok: result.ok,
        duplicate: result.duplicate ?? false,
        ticketId: result.ticketId ?? null,
        state: result.state ?? null,
      })
    }

    return NextResponse.json({ ok: true, processed: results.length, results }, { status: 200 })
  } catch (e) {
    captureError(e, { route: 'POST /api/whatsapp/webhook' })
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'error' },
      { status: 200 },
    )
  }
}
