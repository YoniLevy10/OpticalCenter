import { NextResponse } from 'next/server'
import { z } from 'zod'
import { classifyFaultText } from '@/modules/tickets/classify'
import { normalizeTicketCategory } from '@/modules/tickets/constants'
import { attachReportPhotos } from '@/modules/tickets/attachments'
import { createTicket } from '@/modules/tickets/service'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rate-limit'

const schema = z.object({
  storeCode: z.string().min(1).max(6),
  description: z.string().min(3).max(2000),
  reporterName: z.string().max(80).optional(),
  reporterPhone: z.string().max(32).optional(),
  category: z.string().max(32).optional(),
  assetId: z.string().uuid().optional(),
  photos: z.array(z.string().max(320_000)).max(3).optional(),
})

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
    const limited = checkRateLimit(`report:${ip}`, 20, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }

    const classified = classifyFaultText(parsed.data.description)
    const category = parsed.data.category
      ? normalizeTicketCategory(parsed.data.category)
      : normalizeTicketCategory(classified.category)

    const ticket = await createTicket({
      storeCode: parsed.data.storeCode,
      description: parsed.data.description,
      reporterName: parsed.data.reporterName,
      reporterPhone: parsed.data.reporterPhone,
      source: 'web_fallback',
      category,
      priority: classified.priority,
      countryCode: 'IL',
      assetId: parsed.data.assetId,
    })

    if (parsed.data.photos?.length) {
      await attachReportPhotos(ticket.id, parsed.data.photos)
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    captureError(err, { route: 'POST /api/report' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
