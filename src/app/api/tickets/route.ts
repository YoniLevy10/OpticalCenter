import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TICKET_PRIORITIES } from '@/modules/tickets/constants'
import { createTicket } from '@/modules/tickets/service'

const createSchema = z.object({
  storeId: z.string().uuid().optional(),
  storeCode: z.string().min(1).max(16).optional(),
  countryCode: z.string().min(2).max(8).optional(),
  description: z.string().min(1),
  title: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  source: z
    .enum(['whatsapp', 'qr_whatsapp', 'nfc_whatsapp', 'web_fallback', 'demo'])
    .optional(),
  reporterPhone: z.string().optional(),
  reporterName: z.string().optional(),
  language: z.string().optional(),
  assetId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    if (!parsed.data.storeId && !parsed.data.storeCode) {
      return NextResponse.json(
        { error: 'יש לציין storeId או storeCode' },
        { status: 400 },
      )
    }

    const ticket = await createTicket(parsed.data)
    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת תקלה'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
