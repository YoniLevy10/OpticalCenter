import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { classifyFaultText } from '@/modules/tickets/classify'
import { normalizeTicketCategory } from '@/modules/tickets/constants'
import { attachReportPhotos } from '@/modules/tickets/attachments'
import { createTicket } from '@/modules/tickets/service'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rate-limit'
import { clientIpFromRequest } from '@/lib/rate-limit'

const schema = z.object({
  storeCode: z.string().min(1).max(6),
  description: z.string().min(3).max(2000),
  reporterName: z.string().max(80).optional(),
  reporterPhone: z.string().max(32).optional(),
  category: z.string().max(32).optional(),
  assetId: z.string().uuid().optional(),
  photos: z.array(z.string().max(320_000)).max(3).optional(),
})

function actorStoreIds(actor: Awaited<ReturnType<typeof requireActor>>): string[] {
  return actor.memberships
    .filter(
      (m) =>
        (m.role === 'store_employee' || m.role === 'store_manager') && m.store_id,
    )
    .map((m) => m.store_id!)
}

async function storeCodeAllowed(
  actor: Awaited<ReturnType<typeof requireActor>>,
  storeCode: string,
): Promise<boolean> {
  const isHq = actor.memberships.some((m) =>
    ['global_admin', 'global_maintenance', 'country_manager', 'regional_manager'].includes(
      m.role,
    ),
  )
  if (isHq) return true
  const ids = actorStoreIds(actor)
  if (!ids.length) return false
  const { fetchStores } = await import('@/modules/stores/data')
  const { stores } = await fetchStores()
  const store = stores.find((s) => s.code === storeCode)
  return Boolean(store && ids.includes(store.id))
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    const ip = clientIpFromRequest(request)
    const limited = checkRateLimit(`store-ticket:${actor.id}:${ip}`, 30, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }

    const isStoreStaff = actor.memberships.some(
      (m) => m.role === 'store_employee' || m.role === 'store_manager',
    )
    const isHq = actor.memberships.some((m) =>
      ['global_admin', 'global_maintenance', 'country_manager', 'regional_manager'].includes(
        m.role,
      ),
    )
    if (!isStoreStaff && !isHq) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    if (!(await storeCodeAllowed(actor, parsed.data.storeCode))) {
      return NextResponse.json({ error: 'חנות לא משויכת לחשבון' }, { status: 403 })
    }

    const classified = classifyFaultText(parsed.data.description)
    const category = parsed.data.category
      ? normalizeTicketCategory(parsed.data.category)
      : normalizeTicketCategory(classified.category)

    const ticket = await createTicket({
      storeCode: parsed.data.storeCode,
      description: parsed.data.description,
      reporterName: parsed.data.reporterName ?? actor.full_name ?? undefined,
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
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/store/tickets' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
