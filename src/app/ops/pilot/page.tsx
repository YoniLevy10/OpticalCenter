import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listTickets } from '@/modules/tickets/service'
import { findRecurrences } from '@/modules/tickets/recurrence'
import { computePilotMetrics, type PilotSample } from '@/modules/pilot/metrics'
import { listClassificationCorrections, listFiles, listSpends } from '@/lib/data/ops-ledger'

export const dynamic = 'force-dynamic'

export default async function PilotPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
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
        description: ticket.description,
        status: ticket.status,
        createdAt: ticket.created_at,
      },
      tickets.map((row) => ({
        id: row.id,
        storeId: row.store_id,
        category: row.category,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
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

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <OpsPageHero
          title="מדדי פיילוט"
          status="דיווח, אישור הוצאה, ומסמך שפג תוקף"
        />
        <Panel elevated>
          <dl className="divide-y divide-border">
            <KeyValue label="חציון שעות טיפול">
              {metrics.medianResolveHours?.toFixed(1) ?? '—'}
            </KeyValue>
            <KeyValue label="חציון שעות לאישור">
              {metrics.medianApprovalHours?.toFixed(1) ?? '—'}
            </KeyValue>
            <KeyValue label="תקלות חוזרות">{metrics.repeats}</KeyValue>
            <KeyValue label="פניות מחוץ למערכת">{metrics.outsideSystem}</KeyValue>
            <KeyValue label="קליטה נקייה">
              {metrics.cleanIngestRate == null
                ? '—'
                : `${Math.round(metrics.cleanIngestRate * 100)}%`}
            </KeyValue>
            <KeyValue label="תיקוני סיווג">{listClassificationCorrections().length}</KeyValue>
          </dl>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
