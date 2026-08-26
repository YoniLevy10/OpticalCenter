import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  PageHeader,
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { ReportsFilters } from './reports-filters'
import {
  computeDashboardKpis,
  computeSlaReport,
  computeStoreReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const from = sp.from
  const to = sp.to

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const [ticketResult, techRows] = await Promise.all([
    listTickets(5000).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
  ])
  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const scoped = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const all = filterTicketsByDateRange(scoped, from, to)
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)
  const sla = computeSlaReport(all)
  const storeReport = computeStoreReport(all).slice(0, 10)

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageHeader
          className="hidden md:flex"
          title="דוחות"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
        />

        <ReportsFilters from={from} to={to} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'פתוחות', value: String(kpis.open) },
            { label: 'חריגות SLA', value: String(kpis.breached) },
            { label: 'נפתרו', value: String(kpis.resolvedCount) },
            {
              label: 'ממוצע פתרון',
              value:
                kpis.avgResolveHours != null
                  ? `${kpis.avgResolveHours} שע׳`
                  : '—',
            },
          ].map((c) => (
            <Panel key={c.label} elevated className="!p-4">
              <p className="t-caption text-ink-3">{c.label}</p>
              <p className="t-title t-num mt-1 text-ink">{c.value}</p>
            </Panel>
          ))}
        </div>

        <Panel flush elevated>
          <PanelHeader title="דוח SLA" />
          <ul className="divide-y divide-border">
            {[
              {
                label: 'נפתרו בתוך SLA',
                value: String(sla.resolvedWithinSla),
              },
              {
                label: 'נפתרו בחריגה',
                value: String(sla.resolvedBreached),
              },
              { label: 'פתוחות בחריגה', value: String(sla.openBreached) },
              {
                label: '% בתוך SLA',
                value:
                  sla.pctWithinSla != null ? `${sla.pctWithinSla}%` : '—',
              },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="t-body text-ink">{row.label}</span>
                <span className="t-body-strong t-num text-ink">{row.value}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel flush elevated>
            <PanelHeader title="לפי קטגוריה" />
            {kpis.byCategory.length === 0 ? (
              <EmptyState title="אין נתונים" />
            ) : (
              <ul className="divide-y divide-border">
                {kpis.byCategory.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="t-body text-ink">{c.label}</span>
                    <span className="t-body-strong t-num text-ink">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel flush elevated>
            <PanelHeader title="עומס טכנאים" />
            {kpis.techLoad.length === 0 ? (
              <EmptyState title="אין נתונים" />
            ) : (
              <ul className="divide-y divide-border">
                {kpis.techLoad.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="t-body text-ink">{t.name}</span>
                    <span className="t-body-strong t-num text-ink">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel flush elevated>
          <PanelHeader title="דוח לפי חנות" meta={`${storeReport.length} חנויות`} />
          {storeReport.length === 0 ? (
            <EmptyState title="אין נתונים" />
          ) : (
            <ul className="divide-y divide-border">
              {storeReport.map((s) => (
                <li
                  key={s.code}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="t-body text-ink">
                    <span className="t-num">#{s.code}</span> · {s.name}
                  </span>
                  <span className="t-caption t-num text-ink-2">
                    {s.total} סה״כ · {s.open} פתוחות · {s.breached} חריגות
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops/dashboard">לוח בקרה</Link>
          </Button>
        </div>
      </div>
    </OpsAppShell>
  )
}
