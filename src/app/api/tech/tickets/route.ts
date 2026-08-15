import { NextResponse } from 'next/server'
import { listTechTickets } from '@/modules/tech/service'
import { resolveTechId } from '@/modules/tickets/tech'

export const dynamic = 'force-dynamic'

/** GET /api/tech/tickets — open/assigned jobs for the technician PWA. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const techId = resolveTechId(url.searchParams.get('techId'))
    const { tickets, backend } = await listTechTickets({ techId })
    return NextResponse.json({ tickets, backend, techId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת עבודות'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
