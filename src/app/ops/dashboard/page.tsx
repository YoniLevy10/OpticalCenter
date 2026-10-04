import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Plus,
  Search,
  UserRound,
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
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

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
  const isDemo =
    openResult.backend === 'memory' || doneResult.backend === 'memory'
  const hasOpen = kpis.open > 0
  const urgentCount = kpis.urgent
  const unassigned = kpis.needsAri
  const awaitingCount = kpis.awaitingStoreConfirm

  const statusLine = !hasOpen
    ? 'הכל שקט — אין תקלות פתוחות'
    : unassigned > 0
      ? `${unassigned} בלי שיוך · ${kpis.open} פתוחות`
      : urgentCount > 0
        ? `${urgentCount} דחופות · ${kpis.open} פתוחות`
        : `${kpis.open} פתוחות`

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          showBrand
          largeTitle
          title="דשבורד"
          status={statusLine}
        />

        {/* Quick actions — Apple-like large controls */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button asChild variant="primary" size="touch" className="w-full">
            <Link href="/ops/tickets?view=open" className="inline-flex items-center justify-center gap-2">
              <ClipboardList className="h-4 w-4" aria-hidden />
              תקלות
            </Link>
          </Button>
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href="/report" className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              דיווח חדש
            </Link>
          </Button>
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href="/ops/professionals" className="inline-flex items-center justify-center gap-2">
              <UserRound className="h-4 w-4" aria-hidden />
              אנשי מקצוע
            </Link>
          </Button>
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href="/ops/tickets?view=open&tech=none" className="inline-flex items-center justify-center gap-2">
              <Search className="h-4 w-4" aria-hidden />
              בלי שיוך
            </Link>
          </Button>
        </div>

        {/* General KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <PulseTile
            href="/ops/tickets?view=open"
            value={kpis.open}
            label="פתוחות"
            tone={!hasOpen ? 'ok' : urgentCount > 0 ? 'critical' : 'warning'}
          />
          <PulseTile
            href="/ops/tickets?view=open"
            value={urgentCount}
            label="דחופות"
            tone={urgentCount > 0 ? 'critical' : 'neutral'}
          />
          <PulseTile
            href="/ops/tickets?view=open&tech=none"
            value={unassigned}
            label="בלי שיוך"
            tone={unassigned > 0 ? 'warning' : 'ok'}
          />
          <PulseTile
            href="/ops/tickets?view=resolved"
            value={awaitingCount}
            label="ממתינות לאישור"
            tone={awaitingCount > 0 ? 'warning' : 'neutral'}
          />
        </div>

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
                כל הפתוחות
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
                const openFor = plainOpenForHe(t.created_at, t)
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
                          {awaitingStore ? 'אישור סניף' : 'לטפל ←'}
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
            כל התקלות
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>

        {isDemo ? (
          <p className="t-caption text-center text-ink-3">מצב הדגמה</p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
