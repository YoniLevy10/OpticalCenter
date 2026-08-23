import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, Inbox, PackageOpen, Wrench } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import {
  PageHeader,
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { LiveSla } from '@/components/ui/time'
import { StatusLabel, priorityEdgeClass } from '@/components/ui/signal'
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
}: {
  open: number
  breached: number
  unassigned: number
}) {
  const items = [
    {
      label: 'פתוחות',
      value: open,
      href: queueHref({ view: 'open', sort: 'urgency' }),
      tone: 'default' as const,
    },
    {
      label: 'חריגות SLA',
      value: breached,
      href: queueHref({ view: 'attention', sort: 'sla' }),
      tone: 'critical' as const,
    },
    {
      label: 'לא משויכות',
      value: unassigned,
      href: queueHref({ view: 'unassigned', sort: 'urgency' }),
      tone: 'warn' as const,
    },
  ]

  return (
    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-1)] rtl:divide-x-reverse">
      {items.map((item) => {
        const hot =
          (item.tone === 'critical' || item.tone === 'warn') && item.value > 0
        return (
          <Link
            key={item.label}
            href={item.href}
            className="group px-4 py-3.5 transition-[background-color,box-shadow] duration-[var(--dur-1)] hover:bg-surface-sunken/40 sm:px-5 hover:shadow-[var(--shadow-hover)]"
          >
            <p className="t-caption text-ink-3">{item.label}</p>
            <p
              className={cn(
                't-display t-num mt-1.5',
                hot && item.tone === 'critical' && 'text-[var(--signal-critical)]',
                hot && item.tone === 'warn' && 'text-[var(--signal-warning)]',
                !hot && 'text-ink',
              )}
            >
              {item.value}
            </p>
          </Link>
        )
      })}
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
    <ul className="space-y-3.5 px-4 py-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="t-body truncate text-ink">{item.label}</span>
            <span className="t-body-strong t-num shrink-0 text-ink-2">
              {item.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-[var(--signal-progress)] transition-all duration-700 ease-[var(--ease)]"
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
          <li key={t.id} className={cn('relative', priorityEdgeClass(t.priority))}>
            <Link
              href={`/ops/tickets/${t.id}`}
              className="flex min-h-[56px] items-center gap-3 px-4 py-3 ps-5 transition-colors hover:bg-surface-sunken/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="t-caption t-num text-ink-3">
                    {ticketNumber(t)}
                  </span>
                  {breached ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--signal-critical)]">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      חריגה
                    </span>
                  ) : !t.assigned_to ? (
                    <span className="t-caption text-[var(--signal-warning)]">
                      לא משויך
                    </span>
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

  return (
    <AppShell>
      <div className="space-y-4 stagger">
        <PageHeader
          title="לוח בקרה"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          className="hidden md:flex"
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/tickets">לתור התקלות</Link>
            </Button>
          }
        />

        <div
          className={cn(
            'flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-2.5',
            kpis.breached > 0
              ? 'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]'
              : 'border-border bg-surface shadow-[var(--shadow-1)]',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              kpis.breached > 0
                ? 'animate-pulse bg-[var(--signal-critical)]'
                : 'bg-[var(--signal-resolved)]',
            )}
          />
          <p
            className={cn(
              't-body',
              kpis.breached > 0
                ? 'text-[var(--signal-critical)]'
                : 'text-ink-2',
            )}
          >
            {kpis.breached > 0
              ? `${kpis.breached} תקלות בחריגת SLA — דרוש טיפול מיידי`
              : 'המערכת תקינה — אין חריגות SLA'}
          </p>
        </div>

        <StatStrip
          open={kpis.open}
          breached={kpis.breached}
          unassigned={kpis.unassigned}
        />

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="דורש טיפול עכשיו"
            meta={`${kpis.exceptions.length}`}
            action={
              <Link
                href={queueHref({ view: 'attention', sort: 'urgency' })}
                className="t-caption text-ink-3 hover:text-ink"
              >
                הכל
              </Link>
            }
          />
          <ExceptionList tickets={kpis.exceptions} />
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel flush elevated className="overflow-hidden">
            <PanelHeader title="לפי קטגוריה" meta={`${kpis.byCategory.length}`} />
            {kpis.byCategory.length === 0 ? (
              <EmptyState title="אין תקלות פתוחות" icon={PackageOpen} />
            ) : (
              <BarList items={kpis.byCategory} />
            )}
          </Panel>

          <Panel flush elevated className="overflow-hidden">
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
      </div>
    </AppShell>
  )
}
