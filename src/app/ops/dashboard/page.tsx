import Link from 'next/link'
import { redirect } from 'next/navigation'
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

export const dynamic = 'force-dynamic'

function KpiCard({
  label,
  value,
  href,
  tone = 'default',
}: {
  label: string
  value: number
  href: string
  tone?: 'default' | 'warn'
}) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:bg-canvas"
    >
      <p className="t-caption text-ink-3">{label}</p>
      <p
        className={`t-title t-num mt-1 ${
          tone === 'warn' && value > 0 ? 'text-[var(--signal-critical)]' : 'text-ink'
        }`}
      >
        {value}
      </p>
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
    <ul className="space-y-3 px-4 py-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="t-body truncate text-ink">{item.label}</span>
            <span className="t-meta t-num shrink-0 text-ink-3">{item.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-[var(--tenant)]"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="פתוחות"
            value={kpis.open}
            href={queueHref({ view: 'open', sort: 'urgency' })}
          />
          <KpiCard
            label="חריגות SLA"
            value={kpis.breached}
            href={queueHref({ view: 'attention', sort: 'sla' })}
            tone="warn"
          />
          <KpiCard
            label="לא משויכות"
            value={kpis.unassigned}
            href={queueHref({ view: 'unassigned', sort: 'urgency' })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel flush className="overflow-hidden">
            <PanelHeader title="לפי קטגוריה" meta={`${kpis.byCategory.length}`} />
            {kpis.byCategory.length === 0 ? (
              <EmptyState title="אין תקלות פתוחות" />
            ) : (
              <BarList items={kpis.byCategory} />
            )}
          </Panel>

          <Panel flush className="overflow-hidden">
            <PanelHeader title="חנויות מובילות" meta="פתוחות" />
            {kpis.topStores.length === 0 ? (
              <EmptyState title="אין נתונים" />
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
              <EmptyState title="אין שיוכים פתוחים" />
            ) : (
              <BarList items={kpis.techLoad.map((t) => ({ label: t.name, count: t.count }))} />
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}
