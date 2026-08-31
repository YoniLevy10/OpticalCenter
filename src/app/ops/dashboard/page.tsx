import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { CheckCircle2, MessageSquare, Wrench } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
  PageHeader,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { CreateTicketDialog } from '@/components/ops/create-ticket-dialog'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { queueHref } from '@/modules/tickets/queue'
import { listInboxSessions } from '@/modules/inbox/service'
import { fetchStores } from '@/modules/stores/data'
import {
  greetingHe,
  relativeMinutesHe,
  ticketAttentionItem,
  type AttentionItem,
} from '@/modules/ux/human-copy'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function TodaySummary({
  open,
  unassigned,
  waiting,
  overdue,
}: {
  open: number
  unassigned: number
  waiting: number
  overdue: number
}) {
  const items = [
    {
      label: 'תקלות פתוחות',
      value: open,
      href: queueHref({ view: 'open', sort: 'urgency' }),
    },
    {
      label: 'עדיין בלי טכנאי',
      value: unassigned,
      href: queueHref({ view: 'unassigned', sort: 'urgency' }),
    },
    {
      label: 'מחכות לחלק',
      value: waiting,
      href: queueHref({
        view: 'open',
        sort: 'urgency',
        status: 'waiting_parts',
      }),
    },
    {
      label: 'זמן הטיפול עבר',
      value: overdue,
      href: queueHref({ view: 'attention', sort: 'sla' }),
    },
  ]

  return (
    <section aria-labelledby="today-summary-heading">
      <h2 id="today-summary-heading" className="t-section text-ink">
        מה קורה היום
      </h2>
      <p className="t-body mt-1 text-ink-2">סיכום קצר — לחיצה מובילה לרשימה.</p>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="block rounded-[var(--radius-md)] outline-none transition-colors hover:bg-surface-sunken/50 focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
            >
              <p className="t-display t-num text-ink">{item.value}</p>
              <p className="t-caption mt-1 text-ink-3">{item.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AttentionFeed({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="הכל רגוע כרגע"
        description="כשתגיע תקלה חדשה או הודעה שמחכה לתשובה — תופיע כאן עם הצעד הבא."
        icon={CheckCircle2}
        className="py-14"
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  't-caption',
                  item.hot ? 'text-[var(--signal-warning)]' : 'text-ink-3',
                )}
              >
                {item.kind === 'message' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    {item.eyebrow}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" aria-hidden />
                    {item.eyebrow}
                  </span>
                )}
              </p>
              <p className="t-body-strong mt-1 text-ink">{item.title}</p>
              <p className="t-meta mt-0.5 truncate text-ink-2">{item.subtitle}</p>
            </div>
            <Button asChild variant="primary" size="sm" className="shrink-0 self-start sm:self-center">
              <Link href={item.href}>{item.cta}</Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BarList({ items }: { items: { label: string; count: number }[] }) {
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

  const waItems: AttentionItem[] = inboxResult.sessions
    .filter((s) => s.inbox_status === 'waiting' || s.unread)
    .slice(0, 5)
    .map((s) => {
      const store = s.store_name
        ? s.store_code
          ? `${s.store_name} · #${s.store_code}`
          : s.store_name
        : s.store_code
          ? `סניף #${s.store_code}`
          : null
      return {
        id: s.wa_id,
        kind: 'message' as const,
        eyebrow: 'לקוח מחכה לתשובה',
        title: s.display_name || s.wa_id,
        subtitle: [
          store ?? 'WhatsApp',
          s.updated_at ? relativeMinutesHe(s.updated_at) : null,
          s.last_message,
        ]
          .filter(Boolean)
          .join(' · '),
        href: `/ops/inbox?wa=${encodeURIComponent(s.wa_id)}`,
        cta: 'פתח שיחה',
        hot: true,
      }
    })

  const ticketItems = kpis.exceptions.map((t) => ticketAttentionItem(t))
  const feed = [...waItems, ...ticketItems].slice(0, 8)
  const needsCount = feed.length

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

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-8 stagger">
        <PageHeader
          title={title}
          description={
            needsCount > 0
              ? `יש ${needsCount} דברים שצריכים את הטיפול שלך`
              : 'אין דברים דחופים כרגע — אפשר לפתוח תקלה חדשה או לעבור לרשימות.'
          }
          actions={
            <div className="hidden items-center gap-2 md:flex">
              <Suspense fallback={null}>
                <CreateTicketDialog stores={stores} trigger="header" />
              </Suspense>
            </div>
          }
        />

        <section aria-labelledby="needs-me-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="needs-me-heading" className="t-section text-ink">
                מה צריך את הטיפול שלך עכשיו
              </h2>
              <p className="t-body mt-1 text-ink-2">
                הצעד הבא מופיע ליד כל פריט — בלי לחפש בתפריטים.
              </p>
            </div>
            {needsCount > 0 ? (
              <Link
                href={queueHref({ view: 'attention', sort: 'urgency' })}
                className="t-caption text-ink-3 hover:text-ink"
              >
                לכל התקלות שצריכות טיפול
              </Link>
            ) : null}
          </div>
          <Panel flush elevated className="overflow-hidden">
            <AttentionFeed items={feed} />
          </Panel>
        </section>

        <TodaySummary
          open={kpis.open}
          unassigned={kpis.unassigned}
          waiting={kpis.waiting}
          overdue={kpis.breached}
        />

        <details className="group">
          <summary className="t-body-strong cursor-pointer list-none text-ink marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              פרטים נוספים על היום
            </span>
            <span className="t-caption ms-2 font-normal text-ink-3">
              לפי סוג תקלה ועומס טכנאים
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel flush elevated className="overflow-hidden">
              <PanelHeader title="לפי סוג תקלה" meta={`${kpis.byCategory.length}`} />
              {kpis.byCategory.length === 0 ? (
                <EmptyState title="אין תקלות פתוחות" />
              ) : (
                <BarList items={kpis.byCategory} />
              )}
            </Panel>
            <Panel flush elevated className="overflow-hidden">
              <PanelHeader title="כמה תקלות יש לכל טכנאי" meta="פתוחות" />
              {kpis.techLoad.length === 0 ? (
                <EmptyState title="עדיין אין שיוכים" icon={Wrench} />
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
        </details>
      </div>

      <Suspense fallback={null}>
        <CreateTicketDialog stores={stores} fab />
      </Suspense>
    </OpsAppShell>
  )
}
