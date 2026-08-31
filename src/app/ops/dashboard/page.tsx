import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  Inbox,
  MessageSquare,
  PackageOpen,
  Wrench,
} from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
  PageHeader,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { LiveSla } from '@/components/ui/time'
import { StatusLabel, priorityEdgeClass } from '@/components/ui/signal'
import { CreateTicketDialog } from '@/components/ops/create-ticket-dialog'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { isBreached, queueHref } from '@/modules/tickets/queue'
import { listInboxSessions } from '@/modules/inbox/service'
import { fetchStores } from '@/modules/stores/data'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function ticketNumber(t: QueueTicket): string {
  return t.display_number ?? (t.number != null ? `OC-${t.number}` : '—')
}

function greetingHe(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'בוקר טוב'
  if (hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

function StatStrip({
  open,
  breached,
  unassigned,
  waiting,
}: {
  open: number
  breached: number
  unassigned: number
  waiting: number
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
    {
      label: 'ממתינות לחלקים',
      value: waiting,
      href: queueHref({ view: 'open', sort: 'urgency', status: 'waiting_parts' }),
      tone: 'warn' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map((item) => {
        const hot =
          (item.tone === 'critical' || item.tone === 'warn') && item.value > 0
        return (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-sunken/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
          >
            <p className="t-caption text-ink-3">{item.label}</p>
            <p
              className={cn(
                't-display t-num mt-1',
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
    <ul className="flex flex-col gap-3.5 px-4 py-3.5">
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
        description="כשתופיע חריגת SLA, תקלה לא משויכת או המתנה לחלקים — היא תופיע כאן."
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
                  ) : t.status === 'waiting_parts' ? (
                    <span className="t-caption text-[var(--signal-warning)]">
                      ממתינה לחלקים
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

type WaAttention = {
  wa_id: string
  display_name: string
  store_label: string | null
  last_message: string | null
}

function WhatsAppAttention({ items }: { items: WaAttention[] }) {
  if (items.length === 0) return null

  return (
    <Panel flush elevated className="overflow-hidden">
      <PanelHeader
        title="WhatsApp — דורש מענה"
        meta={`${items.length}`}
        action={
          <Link href="/ops/inbox" className="t-caption text-ink-3 hover:text-ink">
            לתיבה
          </Link>
        }
      />
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.wa_id}>
            <Link
              href={`/ops/inbox?wa=${encodeURIComponent(s.wa_id)}`}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/40"
            >
              <MessageSquare
                className="h-4 w-4 shrink-0 text-[var(--signal-warning)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="t-body truncate text-ink">{s.display_name}</p>
                <p className="t-meta mt-0.5 truncate text-ink-2">
                  {s.store_label ?? s.last_message ?? 'שיחה ממתינה'}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const [ticketResult, techRows, inboxResult, storeResult] = await Promise.all([
    listTickets(500).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
    listInboxSessions().catch(() => ({ sessions: [], backend: 'memory' as const })),
    fetchStores().catch(() => ({ stores: [], fromDb: false })),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)

  const waWaiting = inboxResult.sessions
    .filter((s) => s.inbox_status === 'waiting' || s.unread)
    .slice(0, 5)
    .map((s) => ({
      wa_id: s.wa_id,
      display_name: s.display_name || s.wa_id,
      store_label: s.store_name
        ? s.store_code
          ? `${s.store_name} · #${s.store_code}`
          : s.store_name
        : s.store_code
          ? `סניף #${s.store_code}`
          : null,
      last_message: s.last_message,
    }))

  const stores = storeResult.stores.map((s) => ({
    code: s.code,
    name: s.name,
    id: s.id,
  }))

  const actorName =
    actor?.full_name?.trim() ||
    actor?.email?.split('@')[0] ||
    null
  const greet = greetingHe()
  const title = actorName ? `${greet}, ${actorName}` : greet

  const attentionBits: string[] = []
  if (kpis.breached > 0) attentionBits.push(`${kpis.breached} חריגות SLA`)
  if (waWaiting.length > 0) attentionBits.push(`${waWaiting.length} שיחות WhatsApp`)
  if (kpis.unassigned > 0) attentionBits.push(`${kpis.unassigned} ללא אחראי`)
  if (kpis.waiting > 0) attentionBits.push(`${kpis.waiting} ממתינות לחלקים`)

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-5 stagger">
        <PageHeader
          title={title}
          description="מה דורש טיפול עכשיו — והפעולה הבאה."
          actions={
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/tickets">לתור התקלות</Link>
              </Button>
              <Suspense fallback={null}>
                <CreateTicketDialog stores={stores} trigger="header" />
              </Suspense>
            </div>
          }
        />

        <div className="flex flex-col gap-2 md:hidden">
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href="/ops/tickets">לתור התקלות</Link>
          </Button>
        </div>

        <p
          className={cn(
            't-body border-b border-border pb-3',
            kpis.breached > 0 || waWaiting.length > 0
              ? 'text-[var(--signal-critical)]'
              : 'text-ink-2',
          )}
        >
          {attentionBits.length > 0
            ? `${attentionBits.join(' · ')} — דרוש טיפול`
            : 'אין חריגות כרגע — המערכת רגועה'}
        </p>

        <StatStrip
          open={kpis.open}
          breached={kpis.breached}
          unassigned={kpis.unassigned}
          waiting={kpis.waiting}
        />

        <WhatsAppAttention items={waWaiting} />

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

      <Suspense fallback={null}>
        <CreateTicketDialog stores={stores} fab />
      </Suspense>
    </OpsAppShell>
  )
}
