import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/logging'
import { listTickets } from '@/modules/tickets/service'
import {
  computeDashboardKpis,
  computeSlaReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import type { QueueTicket } from '@/modules/tickets/queue'
import {
  createReportSnapshot,
  defaultOrganizationId,
  listReportSnapshots,
} from '@/modules/reports/snapshots'
import { buildTicketsPdf } from '@/modules/reports/export-formats'
import { notifyMonthlyReport } from '@/lib/email/ops-notify'
import { previousMonthRange } from '@/modules/reports/month-range'

export const runtime = 'nodejs'

function cronAuthorized(request: Request): boolean {
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (request.headers.get('x-cron-secret') === secret) return true
  if (request.headers.get('cron-secret') === secret) return true
  return false
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://optical-center-rose.vercel.app'
  )
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === '1'
    const range = previousMonthRange()
    const orgId = defaultOrganizationId()

    if (!force) {
      const { snapshots } = await listReportSnapshots(orgId)
      const already = snapshots.some(
        (s) =>
          s.period_start === range.from &&
          s.period_end === range.to &&
          s.label.startsWith('דוח חודשי'),
      )
      if (already) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'already_snapshotted',
          month: range.month,
        })
      }
    }

    const { tickets } = await listTickets({ limit: 5000 })
    const all = tickets as unknown as QueueTicket[]
    const filtered = filterTicketsByDateRange(all, range.from, range.to)
    const kpis = computeDashboardKpis(filtered)
    const sla = computeSlaReport(filtered)

    const snapshot = await createReportSnapshot({
      organizationId: orgId,
      periodStart: range.from,
      periodEnd: range.to,
      label: range.label,
      format: 'pdf',
      kpis,
      sla,
      createdBy: null,
    })

    let pdfBase64: string | undefined
    try {
      const pdf = await buildTicketsPdf({
        tickets: filtered,
        kpis,
        sla,
        from: range.from,
        to: range.to,
      })
      pdfBase64 = Buffer.from(pdf).toString('base64')
    } catch (err) {
      logEvent('cron:monthly-report', 'warn', 'pdf_build_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const email = await notifyMonthlyReport({
      monthLabel: range.month,
      periodStart: range.from,
      periodEnd: range.to,
      open: kpis.open,
      resolved: kpis.resolvedCount,
      breached: kpis.breached,
      pctWithinSla: sla.pctWithinSla,
      historyUrl: `${appBaseUrl()}/ops/reports/history`,
      pdfBase64,
    })

    return NextResponse.json({
      ok: true,
      month: range.month,
      snapshotId: snapshot.id,
      ticketCount: filtered.length,
      email: email.detail,
    })
  } catch (e) {
    logEvent('cron:monthly-report', 'error', 'run_failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'cron_failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
