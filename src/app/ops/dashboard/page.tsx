import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { StatStrip } from '@/components/ops/stat-strip'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { DecisionPanel } from './decision-panel'
import { ticketDecision, splitDecisions, type DecisionItem } from '@/modules/decisions/queue'
import { ledgerDecisions } from '@/modules/decisions/from-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listSpends } from '@/lib/data/ops-ledger'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { Tx } from '@/components/i18n/tx'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }
  await hydrateOpsLedger()
  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)

  const [openResult, doneResult, techRows] = await Promise.all([
    listTickets({
      limit: 150,
      statuses: [...OPEN_TICKET_STATUSES],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listTickets({
      limit: 80,
      statuses: ['resolved', 'closed'],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
  ])

  const fetched = [
    ...(openResult.tickets ?? []),
    ...(doneResult.tickets ?? []),
  ] as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)
  const decisions = splitDecisions([
    ...all
      .map((ticket) => ticketDecision(ticket, new Date(), locale))
      .filter((item): item is DecisionItem => item != null),
    ...ledgerDecisions(new Date(), locale),
  ])

  const isDemo =
    openResult.backend === 'memory' || doneResult.backend === 'memory'
  const hasOpen = kpis.open > 0
  const urgentCount = kpis.urgent
  const unassigned = kpis.needsAri
  const awaitingCount = listSpends().filter(
    (spend) => spend.status === 'pending' || spend.status === 'needs_info',
  ).length

  const statusLine = !hasOpen
    ? `${p('הכל שקט')} — ${p('אין תקלות פתוחות')}`
    : unassigned > 0
      ? `${unassigned} ${p('בלי שיוך')} · ${kpis.open} ${p('פתוחות')}`
      : urgentCount > 0
        ? `${urgentCount} ${p('דחופות')} · ${kpis.open} ${p('פתוחות')}`
        : `${kpis.open} ${p('פתוחות')}`

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-4 stagger">
        <OpsPageHero
          title="דשבורד"
          status={
            !hasOpen ? (
              <span className="font-medium text-[var(--signal-resolved)]">
                {statusLine}
              </span>
            ) : (
              statusLine
            )
          }
        />

        {/* Decisions first — what needs action now. */}
        <DecisionPanel
          overdue={decisions.overdue}
          today={decisions.today}
          technicians={technicians}
        />

        {/* Thin peer metrics below the decision console. */}
        <StatStrip
          items={[
            {
              href: '/ops/tickets?view=open',
              value: kpis.open,
              label: 'פתוחות',
              tone: 'neutral',
            },
            {
              href: '/ops/tickets?view=open',
              value: urgentCount,
              label: 'דחופות',
              tone: urgentCount > 0 ? 'critical' : 'neutral',
            },
            {
              href: '/ops/tickets?view=open&tech=none',
              value: unassigned,
              label: 'בלי שיוך',
              tone: unassigned > 0 ? 'warning' : 'neutral',
            },
            {
              href: '/ops/approvals',
              value: awaitingCount,
              label: 'ממתינות לאישור',
              tone: awaitingCount > 0 ? 'warning' : 'neutral',
            },
          ]}
        />

        <Button asChild variant="secondary" size="touch" className="w-full">
          <Link href="/ops/tickets" className="inline-flex items-center gap-2">
            <Tx text="כל התקלות" />
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>

        {isDemo ? (
          <p className="t-caption text-center text-ink-3">
            <Tx text="מצב הדגמה" />
          </p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
