import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import {
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import { listTickets } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import {
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { captureError } from '@/lib/monitoring'

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

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const store = url.searchParams.get('store')
    const status = url.searchParams.get('status')

    const result = await listTickets({
      limit: 5000,
      status: status ?? undefined,
      storeCode: store ?? undefined,
    })
    const fetched = (result.tickets ?? []) as unknown as QueueTicket[]
    let scoped = scopeTicketsForActor(actor, fetched)
    scoped = filterTicketsByDateRange(scoped, from, to)

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
    const filename = `maintainos-tickets-${from ?? 'all'}-${to ?? 'all'}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/reports/export' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
