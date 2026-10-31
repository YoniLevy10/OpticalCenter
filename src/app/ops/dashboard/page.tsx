import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { computeDashboardKpis } from '@/modules/ops/dashboard-kpis'
import { ariGreeting, buildAriHome } from '@/modules/ops/ari-home'
import { listTickets } from '@/modules/tickets/service'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listSpends } from '@/lib/data/ops-ledger'
import { formatRecordedAmount, recordedTicketAmount } from '@/modules/recommendations/estimate'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import type { QueueTicket } from '@/modules/tickets/queue'
import { DashboardSoftRefresh } from './dashboard-soft-refresh'
import { AriHomeBoard } from './ari-home'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }
  await hydrateOpsLedger()
  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)
  const noticeCode = (await searchParams).notice

  const [openResult, doneResult] = await Promise.all([
    listTickets({
      limit: 150,
      statuses: [...OPEN_TICKET_STATUSES],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
    listTickets({
      limit: 80,
      statuses: ['resolved', 'closed'],
    }).catch(() => ({ tickets: [], backend: 'memory' as const })),
  ])

  const fetched = [
    ...(openResult.tickets ?? []),
    ...(doneResult.tickets ?? []),
  ] as unknown as QueueTicket[]
  const all = actor ? scopeTicketsForActor(actor, fetched) : fetched
  const kpis = computeDashboardKpis(all, [])
  const openTickets = all.filter((ticket) =>
    (OPEN_TICKET_STATUSES as readonly string[]).includes(ticket.status),
  )
  const closedTickets = all.filter(
    (ticket) => ticket.status === 'resolved' || ticket.status === 'closed',
  )
  const home = buildAriHome({
    openTickets,
    closedTickets,
    openCount: kpis.open,
    locale,
  })
  const spends = listSpends()
  const ticketCost: Record<string, string> = {}
  const storeCost: Record<string, string> = {}
  const byStore = new Map<string, { sum: number; missing: number }>()
  for (const ticket of openTickets) {
    const amount = recordedTicketAmount(spends, ticket.id)
    ticketCost[ticket.id] = formatRecordedAmount(amount)
    const storeId = ticket.store_id || ''
    const row = byStore.get(storeId) ?? { sum: 0, missing: 0 }
    if (amount == null) row.missing += 1
    else row.sum += amount
    byStore.set(storeId, row)
  }
  for (const [storeId, row] of byStore) {
    if (row.sum <= 0) storeCost[storeId] = 'אין עדיין מחיר'
    else if (row.missing > 0) {
      storeCost[storeId] = `${formatRecordedAmount(row.sum)} נרשמו, ${row.missing} בלי מחיר`
    }
    else storeCost[storeId] = formatRecordedAmount(row.sum)
  }
  const notice =
    noticeCode === 'sent'
      ? p('הביקור הוזמן. המנהל עודכן בוואטסאפ.')
      : noticeCode === 'approved'
        ? p('ההזמנה אושרה')
        : null

  return (
    <OpsAppShell>
      <DashboardSoftRefresh />
      <div className="ari-home flex flex-col gap-4">
        <OpsPageHero compact mark title={ariGreeting()} />
        <AriHomeBoard
          model={home}
          stats={{
            open: kpis.open,
            closedToday: home.closedToday,
            overdue: kpis.breached,
            unassigned: kpis.unassigned,
          }}
          ticketCost={ticketCost}
          storeCost={storeCost}
          notice={notice}
        />
      </div>
    </OpsAppShell>
  )
}
