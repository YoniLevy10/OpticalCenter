import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { VendorsAdmin, type VendorRow } from './vendors-admin'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listVendors } from '@/modules/vendors/service'
import { listRecentAuditEvents } from '@/modules/audit/service'
import { listTickets } from '@/modules/tickets/service'
import { OPEN_TICKET_STATUSES, type TicketStatus } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

function isOpenStatus(status: string) {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
}

export default async function VendorsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const [{ vendors }, { events }, ticketResult] = await Promise.all([
    listVendors(),
    listRecentAuditEvents(300),
    listTickets(1000).catch(() => ({ tickets: [], backend: 'memory' as const })),
  ])

  const ticketById = new Map(
    (ticketResult.tickets ?? []).map((t) => [t.id, t]),
  )

  const byVendor = new Map<
    string,
    { openIds: Set<string>; recent: VendorRow['recent'] }
  >()

  for (const e of events) {
    if (e.event_type !== 'partner_dispatched') continue
    const vendorId = String(
      (e.payload as { vendor_id?: string }).vendor_id ?? '',
    )
    if (!vendorId) continue
    const bucket = byVendor.get(vendorId) ?? {
      openIds: new Set<string>(),
      recent: [],
    }
    const ticket = ticketById.get(e.ticket_id)
    if (ticket && isOpenStatus(ticket.status)) {
      bucket.openIds.add(e.ticket_id)
    }
    if (bucket.recent.length < 8) {
      bucket.recent.push({
        ticket_id: e.ticket_id,
        ticket_display: e.ticket_display,
        created_at: e.created_at,
        status: String((e.payload as { status?: string }).status ?? ''),
      })
    }
    byVendor.set(vendorId, bucket)
  }

  const enriched: VendorRow[] = vendors.map((v) => {
    const stats = byVendor.get(v.id)
    return {
      ...v,
      open_tickets: stats?.openIds.size ?? 0,
      avg_response_label: '—',
      recent: stats?.recent ?? [],
    }
  })

  const activeCount = enriched.filter((v) => v.active).length

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar backHref="/ops/settings" backLabel="חזרה" showRefresh />
        <PageHeader
          className="hidden md:flex"
          title="ספקים"
          description="מי מתחזק מה — ופרטי קשר"
          meta={<span className="t-num">{activeCount}</span>}
        />
        <VendorsAdmin initialVendors={enriched} />
      </div>
    </OpsAppShell>
  )
}
