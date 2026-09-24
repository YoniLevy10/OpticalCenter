import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { suggestVendorsForTicket } from '@/modules/vendors/service'
import { isFixlyEnabled, fixlyStatusLabelHe } from '@/modules/vendors/fixly'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const url = new URL(request.url)
    const category = url.searchParams.get('category') || 'other'
    const regionId = url.searchParams.get('regionId')
    const { matches, backend } = await suggestVendorsForTicket({
      category,
      regionId,
    })
    return NextResponse.json({
      matches,
      backend,
      fixly: {
        enabled: isFixlyEnabled(),
        label: fixlyStatusLabelHe(),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/vendors/suggest' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}
