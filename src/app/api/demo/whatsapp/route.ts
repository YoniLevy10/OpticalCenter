import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { processDemoInbound, type TicketSource } from '@/modules/whatsapp'
import { getById } from '@/modules/tickets/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BodySchema = z.object({
  wa_id: z.string().min(3).max(32),
  text: z.string().max(2000).optional().nullable(),
  store_code: z.string().regex(/^\d{1,6}$/).optional().nullable(),
  media_url: z.string().url().optional().nullable(),
  source: z
    .enum(['whatsapp', 'qr_whatsapp', 'nfc_whatsapp', 'demo'])
    .optional()
    .nullable(),
})

/** Simulate inbound WhatsApp without Meta — same intake service. */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'קלט לא תקין', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { wa_id, text, store_code, media_url, source } = parsed.data
    if (!text?.trim() && !store_code && !media_url) {
      return NextResponse.json(
        { ok: false, error: 'יש להזין טקסט, קוד חנות או קישור לתמונה' },
        { status: 400 },
      )
    }

    const result = await processDemoInbound({
      waId: wa_id,
      text: text ?? null,
      storeCode: store_code ?? null,
      mediaUrl: media_url ?? null,
      source: (source as TicketSource | null) ?? null,
    })

    let ticket: Record<string, unknown> | null = null
    if (result.ticketId) {
      const full = await getById(result.ticketId).catch(() => null)
      if (full) {
        ticket = {
          id: full.id,
          display_number: full.display_number,
          status: full.status,
          priority: full.priority,
          store_code: full.stores?.code ?? store_code ?? null,
          description: full.description,
        }
      } else {
        ticket = {
          id: result.ticketId,
          display_number: result.displayNumber ?? null,
        }
      }
    }

    return NextResponse.json({
      ok: result.ok,
      reply: result.reply,
      ticket,
      duplicate: result.duplicate ?? false,
      ticket_id: result.ticketId ?? null,
      display_number: result.displayNumber ?? null,
      state: result.state ?? null,
      error: result.error ?? null,
    })
  } catch (e) {
    console.error('[demo:whatsapp]', e)
    return NextResponse.json(
      {
        ok: false,
        reply: 'אירעה תקלה זמנית בקליטת הדיווח. נסו שוב בעוד רגע.',
        ticket: null,
        error: e instanceof Error ? e.message : 'שגיאה בסימולטור',
      },
      { status: 500 },
    )
  }
}
