import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PartyPopper } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  EmptyState,
  PageHeader,
  Panel,
  ErrorState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { QueueTabs } from './queue-tabs'
import { PurgeDemoButton } from './purge-demo-button'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import {
  applyQueue,
  type QueueTicket,
} from '@/modules/tickets/queue'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

function technicianName(
  id: string | null | undefined,
  techs: { id: string; name: string }[],
): string {
  if (!id) return 'לא משויך'
  return techs.find((t) => t.id === id)?.name ?? 'טכנאי'
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const viewRaw = (sp.view ?? 'open').trim()
  const view = viewRaw === 'resolved' ? 'resolved' : 'open'
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  // Silent deep-link from store detail — no filter UI.
  const storeCode = (sp.store ?? '').trim() || undefined

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const resolved = await resolveTicketsSupabase(actor)

  const [ticketResult, techRows] = await Promise.all([
    listTickets({
      limit: 1000,
      storeCode,
      client: resolved?.client,
    }).catch((err) => ({
      tickets: [] as Awaited<ReturnType<typeof listTickets>>['tickets'],
      backend: 'supabase' as const,
      error: err instanceof Error ? err.message : 'שגיאה בטעינת תקלות',
    })),
    listInternalTechnicians().catch(() => []),
  ])

  const fetched = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))
  const canPurgeDemo = Boolean(
    actor?.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
    ),
  )
  const listError =
    'error' in ticketResult && ticketResult.error
      ? String(ticketResult.error)
      : null

  const filtered = applyQueue(all, {
    view,
    sort: 'urgency',
    includeDemo: false,
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const baseHref =
    view === 'resolved'
      ? '/ops/tickets?view=resolved'
      : storeCode
        ? `/ops/tickets?view=open&store=${encodeURIComponent(storeCode)}`
        : '/ops/tickets?view=open'

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה"
          showRefresh
        />

        <PageHeader
          className="hidden md:flex"
          title="תקלות"
          meta={<span className="t-num">{filtered.length}</span>}
          actions={
            canPurgeDemo && ticketResult.backend === 'supabase' ? (
              <PurgeDemoButton />
            ) : undefined
          }
        />

        <QueueTabs active={view} />

        {listError ? (
          <ErrorState
            title="שגיאה בטעינה"
            description={listError}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/tickets">רענון</Link>
              </Button>
            }
          />
        ) : null}

        <Panel flush elevated className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState
              title={
                view === 'resolved'
                  ? 'אין תקלות שהסתיימו עדיין'
                  : 'אין תקלות פתוחות 🎉'
              }
              description={
                view === 'open'
                  ? 'כשתדווח תקלה חדשה — היא תופיע כאן.'
                  : undefined
              }
              icon={PartyPopper}
            />
          ) : (
            <RowList>
              {rows.map((t) => {
                const openFor = plainOpenForHe(t.created_at, t)
                return (
                  <OperationalRow
                    key={t.id}
                    href={`/ops/tickets/${t.id}`}
                    priority={t.priority}
                    leading={storeLabel(t.stores)}
                    title={t.title || t.description}
                    footer={
                      <>
                        <StatusLabel status={t.status} />
                        <Dot />
                        <span
                          className={cn(
                            't-meta truncate',
                            openFor.overdue
                              ? 'text-[var(--signal-critical)]'
                              : 'text-ink-2',
                          )}
                        >
                          {view === 'resolved'
                            ? technicianName(t.assigned_to, technicians)
                            : openFor.text}
                        </span>
                      </>
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="t-meta t-num text-ink-3">
              {(current - 1) * PAGE_SIZE + 1}–
              {Math.min(current * PAGE_SIZE, filtered.length)} מתוך{' '}
              {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={current <= 1 ? 'pointer-events-none opacity-40' : ''}
              >
                <Link href={`${baseHref}&page=${current - 1}`}>הקודם</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={
                  current >= totalPages ? 'pointer-events-none opacity-40' : ''
                }
              >
                <Link href={`${baseHref}&page=${current + 1}`}>הבא</Link>
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
