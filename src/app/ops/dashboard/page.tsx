import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  ListChecks,
  Plus,
  Search,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { PulseTile } from '@/components/ops/pulse-tile'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { DecisionQueue } from './decision-queue'
import { ticketDecision, splitDecisions, type DecisionItem } from '@/modules/decisions/queue'
import { ledgerDecisions } from '@/modules/decisions/from-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listSpends } from '@/lib/data/ops-ledger'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { Tx } from '@/components/i18n/tx'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }
  await hydrateOpsLedger()
  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)

  const [openResult, doneResult, techRows] = await Promise.all([
    listTickets({
      limit: 150,
      statuses: [...OPEN_TICKET_STATUSES],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listTickets({
      limit: 80,
      statuses: ['resolved', 'closed'],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
  ])

  const fetched = [
    ...(openResult.tickets ?? []),
    ...(doneResult.tickets ?? []),
  ] as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)
  // One attention queue: exceptions + awaiting store confirm, newest → oldest.
  const attentionById = new Map<string, QueueTicket>()
  for (const t of [
    ...kpis.exceptions,
    ...kpis.awaitingStoreConfirmTickets,
  ]) {
    attentionById.set(t.id, t)
  }
  const attentionQueue = [...attentionById.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 12)
  const decisions = splitDecisions([
    ...all
      .map((ticket) => ticketDecision(ticket, new Date(), locale))
      .filter((item): item is DecisionItem => item != null),
    ...ledgerDecisions(new Date(), locale),
  ])

  const isDemo =
    openResult.backend === 'memory' || doneResult.backend === 'memory'
  const hasOpen = kpis.open > 0
  const urgentCount = kpis.urgent
  const unassigned = kpis.needsAri
  const awaitingCount = listSpends().filter(
    (spend) => spend.status === 'pending' || spend.status === 'needs_info',
  ).length

  const statusLine = !hasOpen
    ? `${p('הכל שקט')} — ${p('אין תקלות פתוחות')}`
    : unassigned > 0
      ? `${unassigned} ${p('בלי שיוך')} · ${kpis.open} ${p('פתוחות')}`
      : urgentCount > 0
        ? `${urgentCount} ${p('דחופות')} · ${kpis.open} ${p('פתוחות')}`
        : `${kpis.open} ${p('פתוחות')}`

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          showBrand
          largeTitle
          title="דשבורד"
          status={
            !hasOpen ? (
              <span className="font-medium text-[var(--signal-resolved)]">
                {statusLine}
              </span>
            ) : (
              statusLine
            )
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DashShortcut href="/ops/tickets?view=open" label="תקלות" icon={ClipboardList} />
          <DashShortcut href="/report" label="דיווח חדש" icon={Plus} />
          <DashShortcut href="/ops/professionals" label="אנשי מקצוע" icon={UserRound} />
          <DashShortcut href="/ops/tickets?view=open&tech=none" label="בלי שיוך" icon={Search} />
          <DashShortcut href="/ops/approvals" label="אישורים" icon={ClipboardCheck} />
          <DashShortcut href="/ops/tasks" label="משימות" icon={ListChecks} />
          <DashShortcut href="/ops/documents" label="מסמכים" icon={FileText} />
          <DashShortcut href="/ops/stores" label="סניפים" icon={Store} />
        </div>

        {/* General KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <PulseTile
            href="/ops/tickets?view=open"
            value={kpis.open}
            label="פתוחות"
            icon={ClipboardList}
            tone="neutral"
          />
          <PulseTile
            href="/ops/tickets?view=open"
            value={urgentCount}
            label="דחופות"
            icon={AlertTriangle}
            mark="critical"
            tone={urgentCount > 0 ? 'critical' : 'neutral'}
          />
          <PulseTile
            href="/ops/tickets?view=open&tech=none"
            value={unassigned}
            label="בלי שיוך"
            icon={Search}
            mark="warning"
            tone={unassigned > 0 ? 'warning' : 'neutral'}
          />
          <PulseTile
            href="/ops/approvals"
            value={awaitingCount}
            label="ממתינות לאישור"
            icon={BadgeCheck}
            mark={awaitingCount > 0 ? 'warning' : 'ok'}
            tone={awaitingCount > 0 ? 'warning' : 'neutral'}
          />
        </div>

        <Panel
          flush
          elevated
          className={cn(
            'overflow-hidden',
            decisions.overdue.length > 0 && 'border-s-[3px]',
          )}
          style={
            decisions.overdue.length > 0
              ? { borderInlineStartColor: 'var(--signal-critical)' }
              : undefined
          }
        >
          <PanelHeader
            title="באיחור"
            meta={decisions.overdue.length ? String(decisions.overdue.length) : undefined}
          />
          <DecisionQueue items={decisions.overdue} technicians={technicians} />
        </Panel>

        <Panel
          flush
          elevated
          className={cn(
            'overflow-hidden',
            decisions.today.length > 0 && 'border-s-[3px]',
          )}
          style={
            decisions.today.length > 0
              ? { borderInlineStartColor: 'var(--signal-warning)' }
              : undefined
          }
        >
          <PanelHeader
            title="דורש החלטה היום"
            meta={decisions.today.length ? String(decisions.today.length) : undefined}
          />
          <DecisionQueue items={decisions.today} technicians={technicians} />
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="דורש טיפול"
            meta={
              attentionQueue.length > 0
                ? String(attentionQueue.length)
                : undefined
            }
            action={
              <Link
                href="/ops/tickets?view=open"
                className="t-caption font-medium text-[var(--tenant)] hover:underline"
              >
                <Tx text="כל הפתוחות" />
              </Link>
            }
          />
          {attentionQueue.length === 0 ? (
            <EmptyState
              title="אין תקלות שדורשות טיפול"
              icon={CheckCircle2}
              className="py-12"
            />
          ) : (
            <RowList>
              {attentionQueue.map((t) => {
                const openFor = plainOpenForHe(t.created_at, t, new Date(), locale)
                const awaitingStore = t.status === 'resolved'
                const num =
                  t.display_number ||
                  (t.number != null ? `OC-${t.number}` : null)
                return (
                  <OperationalRow
                    key={t.id}
                    href={`/ops/tickets/${t.id}`}
                    priority={t.priority}
                    leading={
                      <span className="inline-flex items-center gap-2">
                        {num ? (
                          <span className="t-num text-ink">{num}</span>
                        ) : null}
                        {num ? <span aria-hidden>·</span> : null}
                        <span>{storeLabel(t.stores)}</span>
                      </span>
                    }
                    trailing={
                      <span
                        className={cn(
                          't-meta',
                          openFor.overdue
                            ? 'text-[var(--signal-critical)]'
                            : 'text-ink-3',
                        )}
                      >
                        {awaitingStore ? 'ממתינה לאישור' : openFor.text}
                      </span>
                    }
                    title={t.title || t.description}
                    footer={
                      <>
                        <StatusLabel status={t.status} />
                        <Dot />
                        <span className="t-meta text-ink-2">
                          <Tx text={awaitingStore ? 'אישור סניף' : 'לטפל ←'} />
                        </span>
                      </>
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        <Button asChild variant="secondary" size="touch" className="w-full">
          <Link href="/ops/tickets" className="inline-flex items-center gap-2">
            <Tx text="כל התקלות" />
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>

        {isDemo ? (
          <p className="t-caption text-center text-ink-3">
            <Tx text="מצב הדגמה" />
          </p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}

function DashShortcut({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: LucideIcon
}) {
  return (
    <Link
      href={href}
      className="flex h-14 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-3 shadow-[var(--shadow-1)] transition-shadow duration-[var(--dur-1)] hover:shadow-[var(--shadow-2)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--tenant-soft)] text-[var(--tenant)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="t-control text-ink">
        <Tx text={label} />
      </span>
    </Link>
  )
}
