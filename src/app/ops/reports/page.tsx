import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  PageHeader,
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { ReportsExportButton } from './reports-export'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

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

  return (
    <AppShell>
      <div className="space-y-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה ללוח בקרה"
          title="דוחות"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          showRefresh
        />
        <PageHeader
          title="דוחות"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          className="hidden md:flex"
          actions={
            <ReportsExportButton rows={exportRows} filename="maintainos-tickets.csv" />
          }
        />

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
            <PanelHeader title="חנויות מובילות" />
            {kpis.topStores.length === 0 ? (
              <EmptyState title="אין נתונים" />
            ) : (
              <ul className="divide-y divide-border">
                {kpis.topStores.map((s) => (
                  <li
                    key={s.code}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <Link
                      href={`/ops/tickets?store=${encodeURIComponent(s.code)}`}
                      className="t-body text-ink hover:text-[var(--tenant)] hover:underline"
                    >
                      <span className="t-num">#{s.code}</span> · {s.name}
                    </Link>
                    <span className="t-body-strong t-num text-ink">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-wrap gap-2 md:hidden">
          <ReportsExportButton rows={exportRows} filename="maintainos-tickets.csv" />
        </div>
      </div>
    </AppShell>
  )
}
