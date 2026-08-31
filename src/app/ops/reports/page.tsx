import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  PageHeader,
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ReportsFilters } from './reports-filters'
import { ReportsExportButton } from './reports-export'
import {
  computeDashboardKpis,
  computeSlaReport,
  computeStoreReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { queueHref } from '@/modules/tickets/queue'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { cn } from '@/lib/utils'

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
  const storeReport = computeStoreReport(all).slice(0, 12)

  const exportRows = all.map((t) => ({
    number: t.display_number ?? (t.number != null ? `OC-${t.number}` : t.id),
    status: t.status,
    priority: t.priority,
    category: t.category,
    store: t.stores?.code ?? '',
    store_name: t.stores?.name ?? '',
    created_at: t.created_at,
    resolved_at: t.resolved_at ?? '',
    assigned_to: t.assigned_to ?? '',
  }))

  const maxCategory = Math.max(1, ...kpis.byCategory.map((c) => c.count))
  const topFaultStores = [...storeReport].sort((a, b) => b.total - a.total).slice(0, 3)
  const rangeLabel =
    from || to
      ? [from, to].filter(Boolean).join(' ← ')
      : 'כל התקופה'

  const metrics = [
    {
      label: 'פתוחות',
      value: String(kpis.open),
      href: queueHref({ view: 'open', sort: 'urgency' }),
    },
    {
      label: 'חריגות SLA',
      value: String(kpis.breached),
      href: queueHref({ view: 'attention', sort: 'urgency' }),
      warn: kpis.breached > 0,
    },
    {
      label: 'נפתרו',
      value: String(kpis.resolvedCount),
      href: queueHref({ view: 'resolved', sort: 'newest' }),
    },
    {
      label: 'ממוצע פתרון',
      value:
        kpis.avgResolveHours != null ? `${kpis.avgResolveHours} שע׳` : '—',
      href: null as string | null,
    },
  ]

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה"
          showRefresh
        />
        <PageHeader
          title="דוחות"
          meta={ticketResult.backend === 'supabase' ? rangeLabel : undefined}
          className="hidden md:flex"
          actions={
            <ReportsExportButton rows={exportRows} filename="maintainos-tickets.csv" />
          }
        />

        <ReportsFilters from={from} to={to} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((c) => {
            const inner = (
              <>
                <p className="t-caption text-ink-3">{c.label}</p>
                <p
                  className={cn(
                    't-title t-num mt-1',
                    c.warn ? 'text-[var(--signal-critical)]' : 'text-ink',
                  )}
                >
                  {c.value}
                </p>
              </>
            )
            return c.href ? (
              <Link
                key={c.label}
                href={c.href}
                className="block rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-1)] transition-colors hover:border-border-strong hover:bg-surface-sunken/40"
              >
                {inner}
              </Link>
            ) : (
              <Panel key={c.label} elevated className="!p-4">
                {inner}
              </Panel>
            )
          })}
        </div>

        <Panel elevated className="!p-4 md:!p-5">
          <PanelHeader title="התפלגות לפי קטגוריה" meta="תקלות בטווח" />
          {kpis.byCategory.length === 0 ? (
            <EmptyState title="אין נתונים לטווח שנבחר" />
          ) : (
            <ul className="mt-4 space-y-3">
              {kpis.byCategory.map((c) => {
                const pct = Math.round((c.count / maxCategory) * 100)
                return (
                  <li key={c.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="t-body text-ink">{c.label}</span>
                      <span className="t-body-strong t-num text-ink">{c.count}</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                      role="img"
                      aria-label={`${c.label}: ${c.count}`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--tenant)] transition-[width] duration-[var(--dur-2)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader title="פירוט לפי סניף" meta={`${storeReport.length} סניפים`} />
          {storeReport.length === 0 ? (
            <EmptyState title="אין נתונים" />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {storeReport.map((s) => (
                  <li key={s.code} className="px-4 py-3">
                    <Link
                      href={`/ops/tickets?store=${encodeURIComponent(s.code)}`}
                      className="t-body-strong text-ink hover:text-[var(--tenant)]"
                    >
                      <span className="t-num">#{s.code}</span> · {s.name}
                    </Link>
                    <p className="t-caption t-num mt-1 text-ink-2">
                      {s.total} סה״כ · {s.open} פתוחות · {s.breached} חריגות
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH>סניף</TH>
                    <TH>סה״כ</TH>
                    <TH>פתוחות</TH>
                    <TH>חריגות SLA</TH>
                  </THead>
                  <TBody>
                    {storeReport.map((s) => (
                      <TR key={s.code}>
                        <TD>
                          <Link
                            href={`/ops/tickets?store=${encodeURIComponent(s.code)}`}
                            className="t-body text-ink hover:text-[var(--tenant)] hover:underline"
                          >
                            <span className="t-num">#{s.code}</span> · {s.name}
                          </Link>
                        </TD>
                        <TD>
                          <span className="t-num t-body-strong">{s.total}</span>
                        </TD>
                        <TD>
                          <span className="t-num">{s.open}</span>
                        </TD>
                        <TD>
                          <span
                            className={cn(
                              't-num',
                              s.breached > 0
                                ? 'text-[var(--signal-critical)]'
                                : 'text-ink-2',
                            )}
                          >
                            {s.breached}
                          </span>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          )}
        </Panel>

        <Panel elevated className="!p-4 md:!p-5">
          <PanelHeader title="תובנות" meta="סיכום מהיר לתקופה" />
          <ul className="mt-3 space-y-3">
            <li>
              <p className="t-caption text-ink-3">סניפים עם הכי הרבה תקלות</p>
              {topFaultStores.length === 0 ? (
                <p className="t-body text-ink-2">אין נתונים</p>
              ) : (
                <p className="t-body text-ink">
                  {topFaultStores
                    .map((s) => `${s.name} (${s.total})`)
                    .join(' · ')}
                </p>
              )}
            </li>
            <li>
              <p className="t-caption text-ink-3">זמן טיפול ממוצע</p>
              <p className="t-body text-ink">
                {kpis.avgResolveHours != null
                  ? `${kpis.avgResolveHours} שעות עד פתרון`
                  : 'אין מספיק תקלות סגורות לחישוב'}
              </p>
            </li>
            <li>
              <p className="t-caption text-ink-3">חריגות SLA</p>
              <p className="t-body text-ink">
                {sla.openBreached > 0
                  ? `${sla.openBreached} פתוחות בחריגה כעת`
                  : 'אין פתוחות בחריגה כעת'}
                {sla.resolvedBreached > 0
                  ? ` · ${sla.resolvedBreached} נפתרו אחרי חריגה`
                  : ''}
                {sla.pctWithinSla != null
                  ? ` · ${sla.pctWithinSla}% בתוך SLA`
                  : ''}
              </p>
            </li>
          </ul>
        </Panel>

        <div className="md:hidden">
          <ReportsExportButton rows={exportRows} filename="maintainos-tickets.csv" />
        </div>
      </div>
    </OpsAppShell>
  )
}
