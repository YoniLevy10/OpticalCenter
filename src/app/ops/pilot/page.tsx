import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listTickets } from '@/modules/tickets/service'
import { findRecurrences } from '@/modules/tickets/recurrence'
import { computePilotMetrics, type PilotSample } from '@/modules/pilot/metrics'
import { pilotMoney } from '@/modules/pilot/value'
import { categorySpendBars, moneyBars } from '@/modules/pilot/story'
import { formatIls } from '@/modules/spend/true-cost'
import { RetainChat } from './retain-chat'
import { ValueBars } from './value-charts'
import { listClassificationCorrections, listFiles, listSpends } from '@/lib/data/ops-ledger'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

export const dynamic = 'force-dynamic'

export default async function PilotPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  const { tickets } = await listTickets({ limit: 300 }).catch(() => ({
    tickets: [],
  }))
  const spends = listSpends()
  const files = listFiles()
  const repeatIds: string[] = []
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
    if (repeats.length > 0) {
      repeatIds.push(ticket.id, ...repeats.map((hit) => hit.ticket.id))
    }
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
  const money = pilotMoney(spends, repeatIds)
  const categoryByTicketId: Record<string, string> = {}
  for (const ticket of tickets) {
    if (ticket.id) categoryByTicketId[ticket.id] = ticket.category || 'other'
  }
  const tradeBars = categorySpendBars(spends, categoryByTicketId)
  const savedLine =
    money.bundleSaved > 0
      ? formatIls(money.bundleSaved)
      : 'עדיין אין חיסכון שנספר'

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <OpsPageHero
          title="כמה נחסך"
          status="הכסף שנרשם, והסניף שדורש אותך."
        />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
          <p className="t-caption text-ink-3">נחסך</p>
          <p className="t-title t-num mt-1 text-ink">{savedLine}</p>
          <p className="t-body mt-2 text-ink-2">
            {money.bundleSaved > 0
              ? 'ביקור אחד נרשם זול יותר משתי קריאות נפרדות על אותן תקלות.'
              : 'חיסכון נספר כשעל אותן תקלות יש הצעת מחיר לכל תקלה, וביקור אחד זול יותר משתיהן.'}
          </p>
          <PhoneFoldStack>
          <PhoneFold title="פירוט" summary={savedLine}>
          <div className="mt-5 flex flex-col gap-6">
            <ValueBars title="סכומים שנרשמו" bars={moneyBars(money)} />
            <ValueBars title="הצעות שנרשמו לפי סוג" bars={tradeBars} />
          </div>
          <p className="t-body mt-4 text-ink">
            העלות של כל תיקון נראית לפני שיוצא בעל מקצוע. תקלה שחוזרת נשארת עם המחיר שלה, ואפשר לעצור את הביקור הבא.
          </p>
          </PhoneFold>
          </PhoneFoldStack>
        </section>
        <RetainChat />
        </div>
        <PhoneFold title="מדדים תפעוליים" summary={savedLine}>
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
        </PhoneFold>
      </div>
    </OpsAppShell>
  )
}
