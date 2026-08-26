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
import {
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import {
  buildTicketsPdf,
  buildTicketsXlsx,
} from '@/modules/reports/export-formats'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rate-limit'

const CSV_HEADERS = [
  'מספר',
  'סטטוס',
  'עדיפות',
  'קטגוריה',
  'קוד חנות',
  'שם חנות',
  'נוצר',
  'נפתר',
  'טכנאי',
]

function esc(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

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
    const status = url.searchParams.get('status')

    const [result, techRows] = await Promise.all([
      listTickets({
        limit: 5000,
        status: status ?? undefined,
        storeCode: store ?? undefined,
      }),
      listInternalTechnicians(),
    ])
    const fetched = (result.tickets ?? []) as unknown as QueueTicket[]
    let scoped = scopeTicketsForActor(actor, fetched)
    scoped = filterTicketsByDateRange(scoped, from, to)

    const technicians = techRows.map((t) => ({
      id: t.id,
      name: t.full_name || t.email || t.id.slice(0, 8),
    }))
    const kpis = computeDashboardKpis(scoped, technicians)
    const sla = computeSlaReport(scoped)

    const baseName = month ?? `${from ?? 'all'}-${to ?? 'all'}`

    if (format === 'xlsx') {
      const buf = await buildTicketsXlsx({
        tickets: scoped,
        kpis,
        sla,
        from,
        to,
      })
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="maintainos-${baseName}.xlsx"`,
        },
      })
    }

    if (format === 'pdf') {
      const buf = await buildTicketsPdf({
        tickets: scoped,
        kpis,
        sla,
        from,
        to,
      })
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="maintainos-${baseName}.pdf"`,
        },
      })
    }

    const rows: string[][] = [
      CSV_HEADERS,
      ...scoped.map((t) => [
        t.display_number ?? (t.number != null ? `OC-${t.number}` : t.id),
        TICKET_STATUS_LABELS_HE[t.status as keyof typeof TICKET_STATUS_LABELS_HE] ??
          t.status,
        TICKET_PRIORITY_LABELS_HE[
          t.priority as keyof typeof TICKET_PRIORITY_LABELS_HE
        ] ?? t.priority,
        TICKET_CATEGORY_LABELS_HE[t.category ?? 'other'] ?? t.category,
        t.stores?.code ?? '',
        t.stores?.name ?? '',
        t.created_at,
        t.resolved_at ?? '',
        t.assigned_to ?? '',
      ]),
    ]

    const csv = '\uFEFF' + toCsv(rows)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="maintainos-${baseName}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/reports/export' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
