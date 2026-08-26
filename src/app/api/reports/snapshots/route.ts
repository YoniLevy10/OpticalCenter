import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import {
  computeDashboardKpis,
  computeSlaReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import { listTickets } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import {
  createReportSnapshot,
  defaultOrganizationId,
  listReportSnapshots,
} from '@/modules/reports/snapshots'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rate-limit'

function monthRange(month: string): { from: string; to: string; label: string } | null {
  const m = month.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const from = `${y}-${String(mo).padStart(2, '0')}-01`
  const last = new Date(y, mo, 0).getDate()
  const to = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to, label: `${y}-${String(mo).padStart(2, '0')}` }
}

function orgIdForActor(actor: Awaited<ReturnType<typeof requireActor>>): string {
  return actor.memberships[0]?.organization_id ?? defaultOrganizationId()
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    const orgId = orgIdForActor(actor)
    const { snapshots, backend } = await listReportSnapshots(orgId)
    return NextResponse.json({ snapshots, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/reports/snapshots' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    const limited = checkRateLimit(`report-snapshot:${actor.id}`, 5, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const body = (await request.json()) as { month?: string; format?: string }
    const month = body.month?.trim()
    if (!month) {
      return NextResponse.json({ error: 'חודש חסר (YYYY-MM)' }, { status: 400 })
    }
    const range = monthRange(month)
    if (!range) {
      return NextResponse.json({ error: 'פורמט חודש לא תקין' }, { status: 400 })
    }

    const [result] = await Promise.all([
      listTickets({ limit: 5000 }),
    ])
    const fetched = (result.tickets ?? []) as unknown as QueueTicket[]
    let scoped = scopeTicketsForActor(actor, fetched)
    scoped = filterTicketsByDateRange(scoped, range.from, range.to)

    const kpis = computeDashboardKpis(scoped, [])
    const sla = computeSlaReport(scoped)
    const format = body.format === 'xlsx' ? 'xlsx' : 'pdf'

    const snapshot = await createReportSnapshot({
      organizationId: orgIdForActor(actor),
      periodStart: range.from,
      periodEnd: range.to,
      label: `דוח ${range.label}`,
      format,
      kpis,
      sla,
      createdBy: actor.id,
    })

    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/reports/snapshots' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}
