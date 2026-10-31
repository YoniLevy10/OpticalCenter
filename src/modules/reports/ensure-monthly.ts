import { listTickets } from '@/modules/tickets/service'
import {
  computeDashboardKpis,
  computeSlaReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import type { QueueTicket } from '@/modules/tickets/queue'
import { previousMonthRange } from '@/modules/reports/month-range'
import {
  createReportSnapshot,
  listReportSnapshots,
  type ReportSnapshotRow,
} from '@/modules/reports/snapshots'

/** Save last month's report once. The 1st-of-month cron and the reports page both use this. */
export async function ensurePreviousMonthSnapshot(organizationId: string): Promise<{
  created: boolean
  snapshot: ReportSnapshotRow | null
  month: string
}> {
  const range = previousMonthRange()
  const { snapshots } = await listReportSnapshots(organizationId)
  const existing = snapshots.find(
    (row) =>
      row.period_start === range.from &&
      row.period_end === range.to &&
      row.label.startsWith('דוח חודשי'),
  )
  if (existing) return { created: false, snapshot: existing, month: range.month }

  const { tickets } = await listTickets({ limit: 5000 })
  const filtered = filterTicketsByDateRange(tickets as unknown as QueueTicket[], range.from, range.to)
  const kpis = computeDashboardKpis(filtered)
  const sla = computeSlaReport(filtered)
  const snapshot = await createReportSnapshot({
    organizationId,
    periodStart: range.from,
    periodEnd: range.to,
    label: range.label,
    format: 'pdf',
    kpis,
    sla,
    createdBy: null,
  })
  return { created: true, snapshot, month: range.month }
}
