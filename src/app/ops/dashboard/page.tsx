import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, ThumbsUp } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
  StatCard,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { StatusChip } from '@/components/ui/signal'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const [ticketResult, techRows] = await Promise.all([
    listTickets(500).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)
  const topUrgent = kpis.urgentTickets.slice(0, 5)
  const isDemo = ticketResult.backend === 'memory'
  const hasOpen = kpis.open > 0
  const urgentCount = kpis.urgent
  const unassignedCount = kpis.unassigned

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-5 stagger">
        <h1 className="t-display text-ink">מה קורה עכשיו?</h1>

        <div className="ops-stat-grid">
          <StatCard label="תקלות פתוחות" value={kpis.open} />
          <StatCard
            label="דחופות"
            value={urgentCount}
            tone={urgentCount > 0 ? 'critical' : 'neutral'}
            accent={urgentCount > 0}
            hint={
              urgentCount > 0 ? (
                <span className="text-[var(--signal-critical)]">דורש טיפול</span>
              ) : undefined
            }
          />
          <StatCard
            label="ללא טכנאי"
            value={unassignedCount}
            tone={unassignedCount > 0 ? 'warning' : 'neutral'}
            accent={unassignedCount > 0}
            hint={
              unassignedCount > 0 ? (
                <span className="text-[var(--signal-warning)]">ממתין לשיוך</span>
              ) : undefined
            }
          />
        </div>

        {!hasOpen ? (
          <Panel
            flat
            className="border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)] px-6 py-6 text-center"
          >
            <CheckCircle2
              className="mx-auto mb-2 h-9 w-9 text-[var(--signal-resolved)]"
              aria-hidden
              strokeWidth={1.5}
            />
            <p className="t-lead text-[var(--signal-resolved)]">
              הכל תקין — אין תקלות פתוחות
            </p>
          </Panel>
        ) : null}

        <Panel flush flat className="overflow-hidden">
          <PanelHeader title="תקלות שדורשות תשומת לב" />
          {topUrgent.length === 0 ? (
            <EmptyState
              title="אין תקלות דחופות כרגע 👍"
              description="כשתגיע תקלה דחופה — היא תופיע כאן."
              icon={ThumbsUp}
              className="py-12"
            />
          ) : (
            <RowList>
              {topUrgent.map((t) => {
                const openFor = plainOpenForHe(t.created_at, t)
                return (
                  <OperationalRow
                    key={t.id}
                    href={`/ops/tickets/${t.id}`}
                    priority={t.priority}
                    leading={storeLabel(t.stores)}
                    trailing={
                      <span
                        className={cn(
                          't-meta',
                          openFor.overdue
                            ? 'text-[var(--signal-critical)]'
                            : 'text-ink-3',
                        )}
                      >
                        {openFor.text}
                      </span>
                    }
                    title={t.title || t.description}
                    footer={
                      <>
                        <StatusChip status={t.status} />
                        <Dot />
                        <span className="t-meta text-ink-2">לטפל ←</span>
                      </>
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        <Button asChild variant="primary" size="touch" className="w-full">
          <Link href="/ops/tickets">כל התקלות</Link>
        </Button>

        {isDemo ? (
          <p className="t-caption text-center text-ink-3">מצב הדגמה</p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
