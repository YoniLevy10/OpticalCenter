import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ThumbsUp } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  Panel,
  PanelHeader,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { BrandMark } from '@/components/brand/brand-mark'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import { listVendors } from '@/modules/vendors/service'
import type { QueueTicket } from '@/modules/tickets/queue'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function PulseTile({
  href,
  value,
  label,
  tone = 'neutral',
}: {
  href: string
  value: number | string
  label: string
  tone?: 'neutral' | 'critical' | 'warning' | 'ok'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-[5.25rem] flex-col justify-center gap-1 rounded-[var(--radius-lg)] border px-4 py-3 transition-[background,border-color,box-shadow] duration-[var(--dur-1)] active:opacity-90 md:hover:shadow-[var(--shadow-1)]',
        tone === 'critical' &&
          'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
        tone === 'warning' &&
          'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
        tone === 'ok' &&
          'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)]',
        tone === 'neutral' &&
          'border-border/80 bg-surface md:hover:bg-surface-sunken/40',
      )}
    >
      <span
        className={cn(
          't-display t-num leading-none tracking-tight',
          tone === 'critical' && 'text-[var(--signal-critical)]',
          tone === 'warning' && 'text-[var(--signal-warning)]',
          tone === 'ok' && 'text-[var(--signal-resolved)]',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="t-caption text-ink-2">{label}</span>
    </Link>
  )
}

export default async function OpsDashboardPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const [ticketResult, techRows, vendorResult] = await Promise.all([
    listTickets(500).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listInternalTechnicians().catch(() => []),
    listVendors({ activeOnly: true, preferredOnly: true }).catch(() => ({
      vendors: [],
    })),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const kpis = computeDashboardKpis(all, technicians)
  const topUrgent = kpis.exceptions.slice(0, 5)
  const awaitingConfirm = kpis.awaitingStoreConfirmTickets.slice(0, 5)
  const isDemo = ticketResult.backend === 'memory'
  const hasOpen = kpis.open > 0
  const urgentCount = kpis.urgent
  const needsAri = kpis.needsAri
  const awaitingCount = kpis.awaitingStoreConfirm
  const preferredCount = vendorResult.vendors.length

  const statusLine = !hasOpen
    ? 'הכל שקט — אין תקלות פתוחות כרגע'
    : needsAri > 0
      ? `${needsAri} חריגים דורשים את ארי עכשיו`
      : awaitingCount > 0
        ? `${awaitingCount} ממתינות לאישור חנות`
        : `${kpis.open} פתוחות — בלי חריגים לארי`

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="flex flex-col gap-6 stagger">
        {/* Hero — one job: orient the operator */}
        <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-1)] md:px-7 md:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(ellipse 70% 90% at 100% 0%, color-mix(in srgb, var(--tenant-soft) 70%, transparent), transparent 55%), radial-gradient(ellipse 50% 60% at 0% 100%, color-mix(in srgb, var(--signal-progress) 10%, transparent), transparent 50%)',
            }}
          />
          <div className="relative flex items-start gap-3.5">
            <BrandMark
              size={48}
              priority
              className="mt-0.5 rounded-[var(--radius-md)] shadow-[var(--shadow-2)]"
            />
            <div className="min-w-0 flex-1">
              <p className="t-caption text-ink-3">Optical Center · ישראל</p>
              <h1 className="t-display mt-1 text-ink">מה קורה עכשיו?</h1>
              <p className="t-body mt-1.5 max-w-xl text-ink-2">{statusLine}</p>
            </div>
          </div>
        </header>

        {/* Primary pulse — 4 decisions only */}
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
            href="/ops/tickets?view=open"
            value={needsAri}
            label="דורש את ארי"
            tone={needsAri > 0 ? 'critical' : 'ok'}
          />
          <PulseTile
            href="/ops/tickets?view=resolved"
            value={awaitingCount}
            label="ממתינות לאישור חנות"
            tone={awaitingCount > 0 ? 'warning' : 'neutral'}
          />
        </div>

        {/* Compact secondary pulse — no cards */}
        <p className="t-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3">
          <span>
            ללא אחראי{' '}
            <span className="t-num text-ink-2">{kpis.unassigned}</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            בטיפול <span className="t-num text-ink-2">{kpis.inProgress}</span>
          </span>
          <span aria-hidden>·</span>
          <span>
            חריגות SLA{' '}
            <span
              className={cn(
                't-num',
                kpis.breached > 0
                  ? 'text-[var(--signal-critical)]'
                  : 'text-ink-2',
              )}
            >
              {kpis.breached}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            ספקים מועדפים{' '}
            <span className="t-num text-ink-2">{preferredCount}</span>
          </span>
        </p>

        <Panel
          elevated
          className={cn(
            'px-5 py-4',
            !hasOpen &&
              'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)]',
            hasOpen &&
              urgentCount > 0 &&
              'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
            hasOpen &&
              urgentCount === 0 &&
              'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
          )}
        >
          {!hasOpen ? (
            <div className="flex items-center gap-3">
              <CheckCircle2
                className="h-7 w-7 shrink-0 text-[var(--signal-resolved)]"
                aria-hidden
                strokeWidth={1.5}
              />
              <p className="t-lead text-[var(--signal-resolved)]">
                הכל תקין — אין תקלות פתוחות
              </p>
            </div>
          ) : (
            <div>
              <p className="t-body-strong text-ink">ארי נכנס רק לחריגים</p>
              <p className="t-meta mt-1 text-ink-2">
                שיוך חסר, חריגת SLA או חלקים — המערכת רודפת אחרי חנות וטכנאי בשאר
                המקרים.
              </p>
            </div>
          )}
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="דורש את ארי"
            meta={topUrgent.length > 0 ? String(topUrgent.length) : undefined}
            action={
              <Link
                href="/ops/tickets?view=open"
                className="t-caption text-[var(--tenant)] hover:underline"
              >
                כל הפתוחות
              </Link>
            }
          />
          {topUrgent.length === 0 ? (
            <EmptyState
              title="אין חריגים כרגע"
              description="ארי נכנס רק כשאין שיוך, יש חריגת SLA או ממתינים לחלקים."
              icon={ThumbsUp}
              className="py-12"
            />
          ) : (
            <RowList>
              {topUrgent.map((t) => {
                const openFor = plainOpenForHe(t.created_at, t)
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
                        {openFor.text}
                      </span>
                    }
                    title={t.title || t.description}
                    footer={
                      <>
                        <StatusLabel status={t.status} />
                        <Dot />
                        <span className="t-meta text-ink-2">לטפל ←</span>
                      </>
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        <Panel flush elevated className="overflow-hidden">
          <PanelHeader
            title="ממתינות לאישור חנות"
            meta={
              awaitingConfirm.length > 0
                ? String(awaitingConfirm.length)
                : undefined
            }
          />
          {awaitingConfirm.length === 0 ? (
            <EmptyState
              title="אין ממתינות לאישור"
              description="כשטכנאי מסיים — החנות מאשרת והתקלה נסגרת אוטומטית."
              icon={CheckCircle2}
              className="py-12"
            />
          ) : (
            <RowList>
              {awaitingConfirm.map((t) => {
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
                    title={t.title || t.description}
                    footer={
                      <>
                        <StatusLabel status={t.status} />
                        <Dot />
                        <span className="t-meta text-ink-2">
                          המערכת תזכיר לחנות
                        </span>
                      </>
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        <Button asChild variant="primary" size="touch" className="w-full">
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
