import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { AlertTriangle, MessageSquare, Plus, Search } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
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
import { listInboxSessions } from '@/modules/inbox/service'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function ticketNumber(t: QueueTicket): string {
  return t.display_number ?? (t.number != null ? `OC-${t.number}` : '—')
}

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'בוקר טוב'
  if (hour >= 12 && hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

function MetricGrid({
  open,
  inProgress,
  waiting,
  done,
}: {
  open: number
  inProgress: number
  waiting: number
  done: number
}) {
  const items = [
    {
      label: 'פתוחות',
      value: open,
      href: queueHref({ view: 'open', sort: 'urgency' }),
    },
    {
      label: 'בטיפול',
      value: inProgress,
      href: queueHref({
        view: 'open',
        status: 'in_progress',
        sort: 'urgency',
      }),
    },
    {
      label: 'ממתינות',
      value: waiting,
      href: queueHref({
        view: 'open',
        status: 'waiting_parts',
        sort: 'urgency',
      }),
    },
    {
      label: 'הושלמו',
      value: done,
      href: queueHref({ view: 'resolved', sort: 'newest' }),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-1)] transition-[background-color,box-shadow] duration-[var(--dur-1)] hover:bg-surface-sunken/30 hover:shadow-[var(--shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
        >
          <p className="t-caption text-ink-3">{item.label}</p>
          <p className="t-display t-num mt-1 text-ink">{item.value}</p>
        </Link>
      ))}
    </div>
  )
}

function AttentionList({
  tickets,
  sessions,
}: {
  tickets: QueueTicket[]
  sessions: {
    wa_id: string
    display_name: string
    last_message: string | null
    store_code: string | null
  }[]
}) {
  const hasTickets = tickets.length > 0
  const hasSessions = sessions.length > 0

  if (!hasTickets && !hasSessions) {
    return (
      <EmptyState
        title="הכול תחת שליטה"
        description="אין הודעות ממתינות או תקלות חריגות כרגע."
        className="py-12"
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {sessions.map((s) => (
        <li key={`wa-${s.wa_id}`}>
          <Link
            href="/ops/inbox"
            className="flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/40"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]"
            >
              <MessageSquare className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="t-body-strong truncate text-ink">
                  {s.display_name}
                </span>
                <span className="t-caption shrink-0 text-[var(--signal-warning)]">
                  WhatsApp שלא נענה
                </span>
              </div>
              <p className="t-meta mt-0.5 line-clamp-1 text-ink-2">
                {s.last_message ||
                  (s.store_code ? `סניף #${s.store_code}` : 'הודעה ממתינה')}
              </p>
            </div>
          </Link>
        </li>
      ))}
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
                  ) : (
                    <span className="t-caption text-[var(--signal-warning)]">
                      דחוף
                    </span>
                  )}
                </div>
                <p className="t-body mt-0.5 line-clamp-1 text-ink">
                  {t.title || t.description}
                </p>
                <p className="t-meta mt-0.5 truncate text-ink-2">
                  {t.stores
                    ? `${t.stores.name}${t.stores.code ? ` · #${t.stores.code}` : ''}`
                    : 'ללא סניף'}
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

function RecentActivity({ tickets }: { tickets: QueueTicket[] }) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="אין פעילות אחרונה"
        description="כשתתעדכן תקלה — היא תופיע כאן."
        className="py-10"
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`/ops/tickets/${t.id}`}
            className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-sunken/40"
          >
            <div className="min-w-0 flex-1">
              <p className="t-body line-clamp-1 text-ink">
                <span className="t-caption t-num text-ink-3">
                  {ticketNumber(t)}
                </span>{' '}
                {t.title || t.description}
              </p>
              <p className="t-meta mt-0.5 truncate text-ink-2">
                {t.stores?.name ?? 'ללא סניף'}
              </p>
            </div>
            <StatusLabel status={t.status} />
          </Link>
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

  const [ticketResult, techRows, inboxResult] = await Promise.all([
    listTickets(500).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
    listInboxSessions().catch(() => ({ sessions: [], backend: 'memory' as const })),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)

  const unanswered = inboxResult.sessions
    .filter((s) => s.unread || s.inbox_status === 'waiting')
    .slice(0, 5)
    .map((s) => ({
      wa_id: s.wa_id,
      display_name: s.display_name,
      last_message: s.last_message,
      store_code: s.store_code,
    }))

  const attentionTickets =
    kpis.urgentTickets.length > 0 ? kpis.urgentTickets : kpis.exceptions

  const now = new Date()
  const name =
    actor?.full_name?.trim() ||
    actor?.email?.split('@')[0] ||
    'צוות התפעול'
  const greet = greetingForHour(now.getHours())
  const dateLabel = format(now, "EEEE, d בMMMM yyyy", { locale: he })

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <PageHeader
          title={`${greet}, ${name}`}
          description={`${dateLabel} · מה דורש טיפול היום`}
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          actions={
            <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
              <Link href="/ops/tickets?new=1">
                <Plus className="h-4 w-4" aria-hidden />
                פתיחת תקלה
              </Link>
            </Button>
          }
        />

        <form
          action="/ops/tickets"
          method="get"
          className="flex items-center gap-2"
          role="search"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">חיפוש תקלות</span>
            <Search
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3 start-3"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="חיפוש תקלה, סניף או מספר…"
              className="t-body h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface pe-3 ps-10 text-ink shadow-[var(--shadow-1)] outline-none placeholder:text-ink-3 focus:border-[var(--tenant)] focus:ring-2 focus:ring-[var(--tenant)]/20"
            />
          </label>
          <Button type="submit" variant="secondary" size="touch" className="shrink-0">
            חיפוש
          </Button>
        </form>

        <MetricGrid
          open={kpis.open}
          inProgress={kpis.inProgress}
          waiting={kpis.waiting}
          done={kpis.done}
        />

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="דורש את תשומת לבך"
            meta={`${unanswered.length + attentionTickets.length}`}
            action={
              <Link
                href={queueHref({ view: 'urgent', sort: 'urgency' })}
                className="t-caption text-ink-3 hover:text-ink"
              >
                הכל
              </Link>
            }
          />
          <AttentionList tickets={attentionTickets} sessions={unanswered} />
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="פעילות אחרונה"
            meta={`${kpis.recentActivity.length}`}
            action={
              <Link
                href={queueHref({ view: 'all', sort: 'newest' })}
                className="t-caption text-ink-3 hover:text-ink"
              >
                הכל
              </Link>
            }
          />
          <RecentActivity tickets={kpis.recentActivity} />
        </Panel>

        {/* Mobile FAB — above bottom nav */}
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottomnav-h)+var(--safe-b)+12px)] z-20 flex justify-center md:hidden">
          <Button
            asChild
            variant="primary"
            size="touch"
            className="pointer-events-auto shadow-[var(--shadow-pop)]"
          >
            <Link href="/ops/tickets?new=1">
              <Plus className="h-4 w-4" aria-hidden />
              פתיחת תקלה
            </Link>
          </Button>
        </div>
      </div>
    </OpsAppShell>
  )
}
