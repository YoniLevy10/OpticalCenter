import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR, RowLink } from '@/components/ui/table'
import { StatusLabel, priorityEdgeClass, priorityRowClass } from '@/components/ui/signal'
import { LiveAge } from '@/components/ui/time'
import { Button } from '@/components/ui/button'
import { ReportsFilters } from './reports-filters'
import { ReportsExportActions } from './reports-export'
import { ReportsSaveButton } from './reports-save'
import {
  computeDashboardKpis,
  computeSlaReport,
  computeStoreReport,
  filterTicketsByDateRange,
} from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { queueHref } from '@/modules/tickets/queue'
import {
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import {
  defaultOrganizationId,
  listReportSnapshots,
} from '@/modules/reports/snapshots'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const HISTORY_LIMIT = 80

function ticketNumber(t: QueueTicket): string {
  return t.display_number ?? (t.number != null ? `OC-${t.number}` : t.id.slice(0, 8))
}

function formatDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function filterByStatus(tickets: QueueTicket[], status?: string): QueueTicket[] {
  if (status === 'open') {
    return tickets.filter((t) =>
      OPEN_TICKET_STATUSES.includes(t.status as TicketStatus),
    )
  }
  if (status === 'resolved') {
    return tickets.filter(
      (t) => t.status === 'resolved' || t.status === 'closed',
    )
  }
  return tickets
}

function monthFromRange(from?: string, to?: string): string | undefined {
  if (!from || !to) return undefined
  if (from.slice(0, 7) !== to.slice(0, 7)) return undefined
  if (from.endsWith('-01')) {
    const [y, m] = from.split('-').map(Number)
    if (!y || !m) return undefined
    const last = new Date(y, m, 0).getDate()
    if (to === `${from.slice(0, 7)}-${String(last).padStart(2, '0')}`) {
      return from.slice(0, 7)
    }
  }
  return undefined
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const from = sp.from
  const to = sp.to
  const status = sp.status

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const orgId = actor?.memberships[0]?.organization_id ?? defaultOrganizationId()

  const [ticketResult, techRows, snapshotResult] = await Promise.all([
    listTickets(5000).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
    listReportSnapshots(orgId).catch(() => ({
      snapshots: [],
      backend: 'memory' as const,
    })),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const scoped = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const dated = filterTicketsByDateRange(scoped, from, to)
  const all = filterByStatus(dated, status)

  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const techName = new Map(technicians.map((t) => [t.id, t.name]))

  const kpis = computeDashboardKpis(all, technicians)
  const sla = computeSlaReport(all)
  const storeReport = computeStoreReport(all).slice(0, 15)
  const maxCategory = Math.max(1, ...kpis.byCategory.map((c) => c.count))
  const topFaultStores = [...storeReport].sort((a, b) => b.total - a.total).slice(0, 3)

  const history = [...all]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, HISTORY_LIMIT)

  const snapshots = snapshotResult.snapshots.slice(0, 6)
  const month = monthFromRange(from, to)
  const exportQuery = { from, to, status, month }

  const rangeLabel =
    from || to
      ? [from, to].filter(Boolean).join(' ← ')
      : 'כל התקופה'
  const statusLabel =
    status === 'open' ? ' · פתוחות' : status === 'resolved' ? ' · נפתרו' : ''

  const metrics = [
    {
      label: 'תקלות בטווח',
      value: String(all.length),
      href: null as string | null,
    },
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
    {
      label: 'בתוך SLA',
      value: sla.pctWithinSla != null ? `${sla.pctWithinSla}%` : '—',
      href: null as string | null,
    },
  ]

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5">
        <div className="rounded-[var(--radius-xl)] bg-[var(--ink)] px-5 py-6 text-white shadow-[var(--shadow-pop)] md:px-8 md:py-7">
          <p className="t-caption text-white/60">OPERATIONS OS · REPORTS</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                דוחות
              </h1>
              <p className="t-body mt-2 max-w-xl text-white/70">
                סיכום תפעולי, היסטוריית תקלות והנפקת דוחות לפי טווח תאריכים —
                CSV, Excel ו-PDF.
              </p>
            </div>
            <div className="text-end">
              <p className="t-caption text-white/60">טווח פעיל</p>
              <p className="t-title t-num mt-1 text-white">
                {rangeLabel}
                {statusLabel}
              </p>
              <p className="t-caption t-num mt-1 text-white/60">
                {all.length} תקלות
              </p>
            </div>
          </div>
        </div>

        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה ללוח בקרה"
          title="דוחות"
          meta={
            ticketResult.backend === 'supabase'
              ? `${rangeLabel}${statusLabel}`
              : 'מצב דמו'
          }
          showRefresh
          actions={<ReportsExportActions query={exportQuery} count={all.length} />}
        />

        <ReportsFilters from={from} to={to} status={status} />

        <Panel elevated className="!p-4 md:!p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <PanelHeader title="הנפקת דוח" meta="לפי הטווח שנבחר" />
              <p className="t-body mt-2 max-w-xl text-ink-2">
                הורדה מיידית של פירוט התקלות בטווח, או שמירה להיסטוריית דוחות
                לחודש/תקופה.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 md:items-end">
              <ReportsExportActions query={exportQuery} count={all.length} />
              <ReportsSaveButton from={from} to={to} month={month} />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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

        <div className="grid gap-5 lg:grid-cols-2">
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
                        <span className="t-body-strong t-num text-ink">
                          {c.count}
                        </span>
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

          <Panel elevated className="!p-4 md:!p-5">
            <PanelHeader title="תובנות SLA" meta="סיכום לתקופה" />
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
        </div>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="פירוט לפי סניף"
            meta={`${storeReport.length} סניפים`}
          />
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

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="היסטוריית תקלות"
            meta={
              all.length > HISTORY_LIMIT
                ? `${HISTORY_LIMIT} מתוך ${all.length}`
                : `${history.length} תקלות`
            }
          />
          {history.length === 0 ? (
            <EmptyState
              title="אין תקלות בטווח"
              description="שנו את התאריכים או את סינון הסטטוס כדי לראות היסטוריה."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {history.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className={cn(
                        'block px-4 py-3 transition-colors hover:bg-surface-sunken/40',
                        priorityEdgeClass(t.priority),
                        priorityRowClass(t.priority),
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="t-body-strong t-num text-ink">
                          {ticketNumber(t)}
                        </span>
                        <LiveAge createdAt={t.created_at} className="t-caption text-ink-3" />
                      </div>
                      <p className="t-body mt-1 line-clamp-2 text-ink-2">
                        {t.description || 'ללא תיאור'}
                      </p>
                      <p className="t-caption mt-1 text-ink-3">
                        {t.stores?.code ? `#${t.stores.code}` : '—'} ·{' '}
                        <StatusLabel status={t.status} /> ·{' '}
                        {TICKET_PRIORITY_LABELS_HE[
                          t.priority as keyof typeof TICKET_PRIORITY_LABELS_HE
                        ] ?? t.priority}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH>מספר</TH>
                    <TH>תאריך</TH>
                    <TH>סניף</TH>
                    <TH>קטגוריה</TH>
                    <TH>סטטוס</TH>
                    <TH>עדיפות</TH>
                    <TH>טכנאי</TH>
                    <TH>תיאור</TH>
                  </THead>
                  <TBody>
                    {history.map((t) => (
                      <TR
                        key={t.id}
                        edgeClass={priorityEdgeClass(t.priority)}
                        className={priorityRowClass(t.priority)}
                      >
                        <TD>
                          <RowLink href={`/ops/tickets/${t.id}`}>
                            <span className="t-num t-body-strong">
                              {ticketNumber(t)}
                            </span>
                          </RowLink>
                        </TD>
                        <TD>
                          <span className="t-num t-caption text-ink-2">
                            {formatDay(t.created_at)}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink">
                            {t.stores?.code ? `#${t.stores.code}` : '—'}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink-2">
                            {TICKET_CATEGORY_LABELS_HE[t.category ?? 'other'] ??
                              t.category ??
                              '—'}
                          </span>
                        </TD>
                        <TD>
                          <StatusLabel status={t.status} />
                        </TD>
                        <TD>
                          <span className="t-body text-ink-2">
                            {TICKET_PRIORITY_LABELS_HE[
                              t.priority as keyof typeof TICKET_PRIORITY_LABELS_HE
                            ] ?? t.priority}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink-2">
                            {t.assigned_to
                              ? techName.get(t.assigned_to) ??
                                t.assigned_to.slice(0, 8)
                              : '—'}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body line-clamp-1 max-w-[16rem] text-ink-2">
                            {t.description || '—'}
                          </span>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              {all.length > HISTORY_LIMIT ? (
                <div className="border-t border-border px-4 py-3">
                  <Button asChild variant="secondary" size="sm">
                    <a
                      href={`/api/reports/export?${new URLSearchParams({
                        format: 'csv',
                        ...(from ? { from } : {}),
                        ...(to ? { to } : {}),
                        ...(status ? { status } : {}),
                      }).toString()}`}
                    >
                      הורדת הרשימה המלאה (CSV)
                    </a>
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="ארכיון שמורים"
            meta={`${snapshotResult.snapshots.length} בארכיון`}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/reports/history">כל ההיסטוריה</Link>
              </Button>
            }
          />
          {snapshots.length === 0 ? (
            <EmptyState
              title="אין דוחות שמורים עדיין"
              description="שמרו דוח לטווח למעלה, או צרו דוח חודשי בעמוד ההיסטוריה."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/ops/reports/history">יצירת דוח חודשי</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {snapshots.map((s) => {
                const k = (s.kpis_json ?? {}) as {
                  open?: number
                  resolvedCount?: number
                  pctWithinSla?: number | null
                  ticketCount?: number
                }
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                  >
                    <div>
                      <p className="t-body-strong text-ink">{s.label}</p>
                      <p className="t-caption t-num text-ink-3">
                        {s.period_start} — {s.period_end}
                      </p>
                      <p className="t-meta mt-1 text-ink-2">
                        פתוחות {k.open ?? '—'} · נפתרו {k.resolvedCount ?? '—'} ·
                        SLA {k.pctWithinSla ?? '—'}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a
                          href={`/api/reports/export?${new URLSearchParams({
                            format: 'pdf',
                            from: s.period_start,
                            to: s.period_end,
                          }).toString()}`}
                        >
                          PDF
                        </a>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <a
                          href={`/api/reports/export?${new URLSearchParams({
                            format: 'xlsx',
                            from: s.period_start,
                            to: s.period_end,
                          }).toString()}`}
                        >
                          Excel
                        </a>
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </OpsAppShell>
  )
}
