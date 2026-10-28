import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listTickets } from '@/modules/tickets/service'
import { findRecurrences } from '@/modules/tickets/recurrence'
import { computePilotMetrics, type PilotSample } from '@/modules/pilot/metrics'
import { listFiles, listSpends } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'

export const dynamic = 'force-dynamic'

export default async function PilotPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const { tickets } = await listTickets({ limit: 300 }).catch(() => ({
    tickets: [],
  }))
  const spends = listSpends()
  const files = listFiles()
  const samples: PilotSample[] = tickets.map((ticket) => {
    const repeats = findRecurrences(
      {
        id: ticket.id,
        storeId: ticket.store_id,
        category: ticket.category,
        assetId: ticket.asset_id ?? null,
        description: ticket.description,
        status: ticket.status,
        createdAt: ticket.created_at,
        resolvedAt: ticket.resolved_at ?? null,
      },
      tickets.map((row) => ({
        id: row.id,
        storeId: row.store_id,
        category: row.category,
        assetId: row.asset_id ?? null,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at ?? null,
      })),
    )
    const spend = spends.find((row) => row.ticketId === ticket.id)
    return {
      openedAt: ticket.created_at,
      resolvedAt: ticket.resolved_at ?? null,
      approvalRequestedAt: spend?.createdAt ?? null,
      approvalDecidedAt: spend?.decidedAt ?? null,
      reachedAriOutsideSystem: false,
      repeatedFault: repeats.length > 0,
      ingestedClean: false,
      correctedManually: false,
    }
  })
  const fileSamples: PilotSample[] = files.map((file) => ({
    openedAt: new Date().toISOString(),
    resolvedAt: null,
    approvalRequestedAt: null,
    approvalDecidedAt: null,
    reachedAriOutsideSystem: false,
    repeatedFault: false,
    ingestedClean: file.status === 'ingested',
    correctedManually: file.status === 'needs_review',
  }))
  const metrics = computePilotMetrics([...samples, ...fileSamples])
  const money = spends.reduce(
    (sum, spend) => {
      sum.requested += spend.requestedAmount
      if (spend.status === 'approved') {
        sum.approved += spend.approvedAmount ?? spend.requestedAmount
      }
      if (spend.status === 'pending' || spend.status === 'needs_info') {
        sum.waiting += spend.requestedAmount
      }
      sum.actual += spend.actualAmount ?? 0
      return sum
    },
    { requested: 0, approved: 0, waiting: 0, actual: 0 },
  )
  const shekel = (amount: number) =>
    new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(amount)

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <OpsPageHero
          title="ROI"
          status={`${metrics.repeats} תקלות חוזרות · ${shekel(money.approved)} אושרו`}
        />
        <Panel elevated>
          <dl className="divide-y divide-border">
            <KeyValue label="מבוקש">{shekel(money.requested)}</KeyValue>
            <KeyValue label="אושר">{shekel(money.approved)}</KeyValue>
            <KeyValue label="ממתין">{shekel(money.waiting)}</KeyValue>
            <KeyValue label="בפועל">{shekel(money.actual)}</KeyValue>
            <KeyValue label="תקלות חוזרות">{metrics.repeats}</KeyValue>
            <KeyValue label="חציון שעות טיפול">
              {metrics.medianResolveHours?.toFixed(1) ?? '—'}
            </KeyValue>
            <KeyValue label="חציון שעות לאישור">
              {metrics.medianApprovalHours?.toFixed(1) ?? '—'}
            </KeyValue>
            <KeyValue label="עלות המערכת בחודש">{shekel(10_000)}</KeyValue>
          </dl>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
