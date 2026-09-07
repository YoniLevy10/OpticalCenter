import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, ThumbsUp } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
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

function DashTile({
  href,
  value,
  label,
  tone = 'neutral',
}: {
  href: string
  value: number | string
  label: string
  tone?: 'neutral' | 'critical' | 'warning' | 'ok'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[5.5rem] flex-col justify-center gap-1 rounded-[var(--radius-lg)] border px-4 py-3 transition-colors duration-[var(--dur-1)] active:opacity-90 md:hover:bg-surface-sunken/40',
        tone === 'critical' &&
          'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
        tone === 'warning' &&
          'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
        tone === 'ok' &&
          'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)]',
        tone === 'neutral' && 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          't-display t-num leading-none',
          tone === 'critical' && 'text-[var(--signal-critical)]',
          tone === 'warning' && 'text-[var(--signal-warning)]',
          tone === 'ok' && 'text-[var(--signal-resolved)]',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="t-caption text-ink-2">{label}</span>
    </Link>
  )
}

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

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-5 stagger">
        <h1 className="t-display text-ink">מה קורה עכשיו?</h1>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DashTile
            href="/ops/tickets?view=open"
            value={kpis.open}
            label="פתוחות"
            tone={
              !hasOpen ? 'ok' : urgentCount > 0 ? 'critical' : 'warning'
            }
          />
          <DashTile
            href="/ops/tickets?view=open"
            value={urgentCount}
            label="דחופות"
            tone={urgentCount > 0 ? 'critical' : 'neutral'}
          />
          <DashTile
            href="/ops/tickets?view=open"
            value={kpis.unassigned}
            label="ללא אחראי"
            tone={kpis.unassigned > 0 ? 'warning' : 'neutral'}
          />
          <DashTile
            href="/ops/tickets?view=open"
            value={kpis.inProgress}
            label="בטיפול"
          />
          <DashTile
            href="/ops/tickets?view=open"
            value={kpis.waiting}
            label="ממתינות לחלקים"
          />
          <DashTile
            href="/ops/tickets?view=resolved"
            value={kpis.done}
            label="הסתיימו"
            tone="ok"
          />
          <DashTile
            href="/ops/tickets?view=open"
            value={kpis.breached}
            label="חריגות SLA"
            tone={kpis.breached > 0 ? 'critical' : 'neutral'}
          />
          <DashTile
            href="/ops/users"
            value={technicians.length}
            label="טכנאים"
          />
        </div>

        <Panel
          elevated
          className={cn(
            'px-6 py-6 text-center',
            !hasOpen &&
              'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)]',
            hasOpen &&
              urgentCount > 0 &&
              'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
            hasOpen &&
              urgentCount === 0 &&
              'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
          )}
        >
          {!hasOpen ? (
            <>
              <CheckCircle2
                className="mx-auto mb-3 h-10 w-10 text-[var(--signal-resolved)]"
                aria-hidden
                strokeWidth={1.5}
              />
              <p className="t-lead text-[var(--signal-resolved)]">
                הכל תקין — אין תקלות פתוחות
              </p>
            </>
          ) : (
            <p className="t-body text-ink-2">
              {urgentCount > 0
                ? `${urgentCount} דחופות דורשות טיפול עכשיו`
                : 'יש תקלות פתוחות — אין דחופות כרגע'}
            </p>
          )}
        </Panel>

        <Panel flush elevated className="overflow-hidden">
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
                const num =
                  t.display_number ||
                  (t.number != null ? `OC-${t.number}` : null)
                return (
                  <OperationalRow
                    key={t.id}
                    href={`/ops/tickets/${t.id}`}
                    priority={t.priority}
                    leading={
                      <span className="inline-flex items-center gap-2">
                        {num ? (
                          <span className="t-num text-ink">{num}</span>
                        ) : null}
                        {num ? <span aria-hidden>·</span> : null}
                        <span>{storeLabel(t.stores)}</span>
                      </span>
                    }
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
                        <StatusLabel status={t.status} />
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

        <Button asChild variant="secondary" size="touch" className="w-full">
          <Link href="/ops/tickets">כל התקלות</Link>
        </Button>

        {isDemo ? (
          <p className="t-caption text-center text-ink-3">מצב הדגמה</p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
