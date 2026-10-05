import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PartyPopper } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  EmptyState,
  Panel,
  ErrorState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { QueueTabs } from './queue-tabs'
import { TicketSearch } from './ticket-search'
import { TicketFilters } from './ticket-filters'
import { PurgeDemoButton } from './purge-demo-button'
import { TicketQueueItem } from './ticket-queue-item'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import {
  applyQueue,
  parseQueueParams,
  queueHref,
  type QueueTicket,
  type QueueView,
} from '@/modules/tickets/queue'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'
import { Tx } from '@/components/i18n/tx'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { translate } from '@/lib/i18n/messages'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
/** Cap DB fetch; view filters open vs resolved at the query when possible. */
const FETCH_LIMIT = 200

function technicianName(
  id: string | null | undefined,
  techs: { id: string; name: string }[],
  locale: 'he' | 'en' | 'fr',
): string {
  if (!id) return phrase(locale, 'לא משויך')
  return techs.find((t) => t.id === id)?.name ?? phrase(locale, 'טכנאי')
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const parsed = parseQueueParams(sp)
  const view: QueueView = parsed.view === 'resolved' ? 'resolved' : 'open'
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  // Silent deep-link from store detail — no filter UI.
  const storeCode = parsed.store || (sp.store ?? '').trim() || undefined
  const q = parsed.q || (sp.q ?? '').trim() || undefined

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }
  const locale = await getLocale()

  const resolved = await resolveTicketsSupabase(actor)

  const statuses =
    view === 'resolved'
      ? ['resolved', 'closed']
      : [...OPEN_TICKET_STATUSES]

  const [ticketResult, techRows] = await Promise.all([
    listTickets({
      limit: FETCH_LIMIT,
      storeCode,
      statuses,
      q,
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

  const queueFilters = {
    ...parsed,
    view,
    sort: 'newest' as const,
    store: storeCode,
    includeDemo: false,
    q,
  }

  // Newest → oldest; sequential OC-N numbers shown on each row.
  const filtered = applyQueue(all, queueFilters)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const baseHref = queueHref(queueFilters)

  const statusLine =
    view === 'resolved'
      ? filtered.length === 0
        ? translate(locale, 'tickets.noneResolved')
        : translate(locale, 'tickets.resolved', { count: filtered.length })
      : filtered.length === 0
        ? translate(locale, 'tickets.noneOpen')
        : translate(locale, 'tickets.open', { count: filtered.length })

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          largeTitle
          title={translate(locale, 'tickets.title')}
          status={statusLine}
          actions={
            canPurgeDemo && ticketResult.backend === 'supabase' ? (
              <PurgeDemoButton />
            ) : undefined
          }
        />

        <QueueTabs active={view} filters={queueFilters} />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="min-w-0 flex-1">
            <Suspense fallback={null}>
              <TicketSearch initialQ={q ?? ''} />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <TicketFilters />
          </Suspense>
        </div>
        <p className="t-caption text-ink-3">
          <Tx text="מיון: מהחדש לישן" />
        </p>

        {listError ? (
          <ErrorState
            title="שגיאה בטעינה"
            description={listError}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/tickets">
                  <Tx text="רענון" />
                </Link>
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
            <div className="divide-y divide-border bg-surface">
              {rows.map((t) => (
                <TicketQueueItem
                  key={t.id}
                  ticket={t}
                  view={view}
                  assigneeLabel={technicianName(t.assigned_to, technicians, locale)}
                />
              ))}
            </div>
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
                <Link
                  href={`${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${current - 1}`}
                >
                  הקודם
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={
                  current >= totalPages ? 'pointer-events-none opacity-40' : ''
                }
              >
                <Link
                  href={`${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${current + 1}`}
                >
                  הבא
                </Link>
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
