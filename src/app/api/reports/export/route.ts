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
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { listSpends } from '@/lib/data/ops-ledger'
import { recordedTicketAmount } from '@/modules/recommendations/estimate'
import {
  buildTicketsCsv,
  buildTicketsPdf,
  buildTicketsXlsx,
} from '@/modules/reports/export-formats'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rate-limit'

function monthRange(month: string): { from: string; to: string } | null {
  const m = month.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const from = `${y}-${String(mo).padStart(2, '0')}-01`
  const last = new Date(y, mo, 0).getDate()
  const to = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    const limited = checkRateLimit(`reports-export:${actor.id}`, 10, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const url = new URL(request.url)
    const format = (url.searchParams.get('format') ?? 'csv').toLowerCase()
    let from = url.searchParams.get('from')
    let to = url.searchParams.get('to')
    const month = url.searchParams.get('month')
    if (month) {
      const range = monthRange(month)
      if (range) {
        from = range.from
        to = range.to
      }
    }
    const store = url.searchParams.get('store')
    const statusParam = url.searchParams.get('status')

    const listStatus =
      statusParam && statusParam !== 'open' && statusParam !== 'resolved'
        ? statusParam
        : undefined

    const [result, techRows] = await Promise.all([
      listTickets({
        limit: 5000,
        status: listStatus,
        storeCode: store ?? undefined,
      }),
      listInternalTechnicians(),
    ])
    const fetched = (result.tickets ?? []) as unknown as QueueTicket[]
    let scoped = scopeTicketsForActor(actor, fetched)
    scoped = filterTicketsByDateRange(scoped, from, to)
    if (statusParam === 'open') {
      scoped = scoped.filter((t) =>
        OPEN_TICKET_STATUSES.includes(
          t.status as (typeof OPEN_TICKET_STATUSES)[number],
        ),
      )
    } else if (statusParam === 'resolved') {
      scoped = scoped.filter(
        (t) => t.status === 'resolved' || t.status === 'closed',
      )
    }

    const technicians = techRows.map((t) => ({
      id: t.id,
      name: t.full_name || t.email || t.id.slice(0, 8),
    }))
    const kpis = computeDashboardKpis(scoped, technicians)
    const sla = computeSlaReport(scoped)
    const spends = listSpends()
    const recorded: Record<string, number> = {}
    for (const ticket of scoped) {
      const amount = recordedTicketAmount(spends, ticket.id)
      if (amount != null) recorded[ticket.id] = amount
    }
    const techNames: Record<string, string> = {}
    for (const tech of technicians) techNames[tech.id] = tech.name
    const report = {
      tickets: scoped,
      kpis,
      sla,
      from,
      to,
      techNames,
      recorded,
    }

    const baseName =
      month ?? (from || to ? `${from ?? 'start'}-${to ?? 'today'}` : 'report')
    const filename = `optical-center-${baseName}`

    if (format === 'xlsx') {
      const buf = await buildTicketsXlsx(report)
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      })
    }

    if (format === 'pdf') {
      const buf = await buildTicketsPdf(report)
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    const csv = buildTicketsCsv(report)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/reports/export' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
