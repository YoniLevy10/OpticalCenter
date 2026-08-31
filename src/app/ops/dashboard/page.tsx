import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, Inbox, PackageOpen, Wrench } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
  PageHeader,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { LiveSla } from '@/components/ui/time'
import { StatusLabel } from '@/components/ui/signal'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { isBreached, queueHref } from '@/modules/tickets/queue'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function ticketNumber(t: QueueTicket): string {
  return t.display_number ?? (t.number != null ? `OC-${t.number}` : '—')
}

function StatStrip({
  open,
  breached,
  unassigned,
  resolved,
}: {
  open: number
  breached: number
  unassigned: number
  resolved: number
}) {
  const items = [
    {
      label: 'פתוחות',
      value: open,
      href: queueHref({ view: 'open', sort: 'urgency' }),
      warn: false,
    },
    {
      label: 'חריגות SLA',
      value: breached,
      href: queueHref({ view: 'attention', sort: 'sla' }),
      warn: breached > 0,
    },
    {
      label: 'לא משויכות',
      value: unassigned,
      href: queueHref({ view: 'unassigned', sort: 'urgency' }),
      warn: false,
    },
    {
      label: 'נפתרו היום',
      value: resolved,
      href: queueHref({ view: 'resolved', sort: 'newest' }),
      warn: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-4 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
        >
          <p className="t-caption flex items-center gap-1.5 text-ink-3">
            {item.warn ? (
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-[var(--signal-critical)]"
              />
            ) : null}
            {item.label}
          </p>
          <p className="t-display t-num mt-2 text-ink">{item.value}</p>
        </Link>
      ))}
    </div>
  )
}

function BarList({
  items,
}: {
  items: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="flex flex-col gap-4 px-4 py-4">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="t-body truncate text-ink">{item.label}</span>
            <span className="t-body-strong t-num shrink-0 text-ink-2">
              {item.count}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-[var(--tenant)]/70 transition-all duration-500 ease-[var(--ease)]"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ExceptionList({ tickets }: { tickets: QueueTicket[] }) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="אין חריגים כרגע"
        description="כשתופיע חריגת SLA או תקלה לא משויכת — היא תופיע כאן."
        icon={Inbox}
        className="py-12"
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {tickets.map((t) => {
        const breached = isBreached(t)
        return (
          <li key={t.id}>
            <Link
              href={`/ops/tickets/${t.id}`}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken"
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 size-1.5 shrink-0 rounded-full',
                  t.priority === 'critical'
                    ? 'bg-[var(--signal-critical)]'
                    : t.priority === 'high'
                      ? 'bg-[var(--signal-warning)]'
                      : 'bg-ink-3',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="t-caption t-num text-ink-3">
                    {ticketNumber(t)}
                  </span>
                  {breached ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--signal-critical)]">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      חריגה
                    </span>
                  ) : !t.assigned_to ? (
                    <span className="t-caption text-ink-2">לא משויך</span>
                  ) : null}
                </div>
                <p className="t-body mt-0.5 line-clamp-1 text-ink">
                  {t.title || t.description}
                </p>
                <p className="t-meta mt-0.5 truncate text-ink-2">
                  {t.stores
                    ? `${t.stores.name}${t.stores.code ? ` · #${t.stores.code}` : ''}`
                    : 'ללא חנות'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <LiveSla ticket={t} />
                <StatusLabel status={t.status} />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
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

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const resolvedToday = all.filter(
    (t) =>
      (t.status === 'resolved' || t.status === 'closed') &&
      t.resolved_at &&
      new Date(t.resolved_at).getTime() >= startOfDay.getTime(),
  ).length

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="לוח בקרה"
          description="תמונה חיה של מה שדורש תשומת לב עכשיו."
          actions={
            <Button asChild variant="primary" size="sm">
              <Link href="/ops/tickets">לתור התקלות</Link>
            </Button>
          }
        />

        <StatStrip
          open={kpis.open}
          breached={kpis.breached}
          unassigned={kpis.unassigned}
          resolved={resolvedToday}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel flush className="overflow-hidden lg:col-span-2">
            <PanelHeader
              title="דורש טיפול עכשיו"
              meta={`${kpis.exceptions.length}`}
              action={
                <Link
                  href={queueHref({ view: 'attention', sort: 'urgency' })}
                  className="t-caption text-ink-3 hover:text-[var(--tenant)]"
                >
                  הכל
                </Link>
              }
            />
            <ExceptionList tickets={kpis.exceptions} />
          </Panel>

          <Panel flush className="overflow-hidden">
            <PanelHeader title="עומס טכנאים" meta="משויכות פתוחות" />
            {kpis.techLoad.length === 0 ? (
              <EmptyState title="אין שיוכים פתוחים" icon={Wrench} />
            ) : (
              <BarList
                items={kpis.techLoad.map((t) => ({
                  label: t.name,
                  count: t.count,
                }))}
              />
            )}
          </Panel>
        </div>

        <Panel flush className="overflow-hidden">
          <PanelHeader title="פילוח לפי קטגוריה" meta={`${kpis.byCategory.length}`} />
          {kpis.byCategory.length === 0 ? (
            <EmptyState title="אין תקלות פתוחות" icon={PackageOpen} />
          ) : (
            <BarList items={kpis.byCategory} />
          )}
        </Panel>
      </div>
    </OpsAppShell>
  )
}
