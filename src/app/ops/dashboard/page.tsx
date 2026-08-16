import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  Inbox,
  PackageOpen,
  UserMinus,
  Wrench,
} from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, Panel, PanelHeader, EmptyState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { queueHref } from '@/modules/tickets/queue'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function KpiCard({
  label,
  value,
  href,
  tone = 'default',
  icon: Icon,
}: {
  label: string
  value: number
  href: string
  tone?: 'default' | 'warn' | 'critical'
  icon?: typeof Inbox
}) {
  const toneColor =
    tone === 'critical' && value > 0
      ? 'text-[var(--signal-critical)]'
      : tone === 'warn' && value > 0
        ? 'text-[var(--signal-warning)]'
        : 'text-ink'

  const toneBg =
    tone === 'critical' && value > 0
      ? 'bg-[var(--signal-critical-soft)]'
      : tone === 'warn' && value > 0
        ? 'bg-[var(--signal-warning-soft)]'
        : 'bg-surface'

  return (
    <Link
      href={href}
      className={cn(
        'group relative overflow-hidden rounded-[var(--radius-lg)] border border-border p-5 transition-all duration-[var(--dur-1)] hover:shadow-[var(--shadow-1)] active:scale-[0.98]',
        toneBg,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-[3px]',
          tone === 'critical' && value > 0
            ? 'bg-[var(--signal-critical)]'
            : tone === 'warn' && value > 0
              ? 'bg-[var(--signal-warning)]'
              : 'bg-transparent',
        )}
      />
      <div className="flex items-center justify-between">
        <p className="t-caption text-ink-3">{label}</p>
        {Icon ? (
          <Icon
            className={cn(
              'h-4 w-4 text-ink-3 transition-colors group-hover:text-ink-2',
              toneColor,
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <p className={cn('t-display t-num mt-3', toneColor)}>{value}</p>
      <span
        aria-hidden
        className="absolute bottom-4 end-4 text-ink-3 opacity-0 transition-all duration-[var(--dur-1)] group-hover:opacity-100 group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px]"
      >
        ←
      </span>
    </Link>
  )
}

function BarList({
  items,
}: {
  items: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="space-y-3.5 px-4 py-4">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="t-body truncate text-ink">{item.label}</span>
            <span className="t-body-strong t-num shrink-0 text-ink-2">
              {item.count}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-[var(--tenant)] transition-all duration-500 ease-[var(--ease)]"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
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
      <div className="space-y-4">
        <PageHeader
          title="לוח בקרה"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/tickets">לתור התקלות</Link>
            </Button>
          }
        />

        {/* Operational status banner */}
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 rounded-full',
              kpis.breached > 0
                ? 'bg-[var(--signal-critical)] animate-pulse'
                : 'bg-[var(--signal-resolved)]',
            )}
          />
          <p className="t-body text-ink-2">
            {kpis.breached > 0
              ? `${kpis.breached} תקלות בחריגת SLA — דרוש טיפול מיידי`
              : 'המערכת תקינה — אין חריגות SLA'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="פתוחות"
            value={kpis.open}
            href={queueHref({ view: 'open', sort: 'urgency' })}
            icon={Inbox}
          />
          <KpiCard
            label="חריגות SLA"
            value={kpis.breached}
            href={queueHref({ view: 'attention', sort: 'sla' })}
            tone="critical"
            icon={AlertTriangle}
          />
          <KpiCard
            label="לא משויכות"
            value={kpis.unassigned}
            href={queueHref({ view: 'unassigned', sort: 'urgency' })}
            tone="warn"
            icon={UserMinus}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel flush className="overflow-hidden">
            <PanelHeader title="לפי קטגוריה" meta={`${kpis.byCategory.length}`} />
            {kpis.byCategory.length === 0 ? (
              <EmptyState title="אין תקלות פתוחות" icon={PackageOpen} />
            ) : (
              <BarList items={kpis.byCategory} />
            )}
          </Panel>

          <Panel flush className="overflow-hidden">
            <PanelHeader title="חנויות מובילות" meta="פתוחות" />
            {kpis.topStores.length === 0 ? (
              <EmptyState title="אין נתונים" icon={Inbox} />
            ) : (
              <ul className="divide-y divide-border">
                {kpis.topStores.map((s) => (
                  <li key={s.code}>
                    <Link
                      href={queueHref(
                        { view: 'open', sort: 'urgency' },
                        { store: s.code === '—' ? undefined : s.code },
                      )}
                      className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas"
                    >
                      <span className="t-body-strong t-num w-10 shrink-0 text-ink">
                        {s.code}
                      </span>
                      <span className="t-body min-w-0 flex-1 truncate text-ink-2">
                        {s.name}
                      </span>
                      <span className="t-meta t-num shrink-0 text-ink-3">
                        {s.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
      </div>
    </AppShell>
  )
}
