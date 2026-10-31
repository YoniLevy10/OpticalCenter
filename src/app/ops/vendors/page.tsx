import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { VendorsAdmin, type VendorRow } from './vendors-admin'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listVendors } from '@/modules/vendors/service'
import { listRecentAuditEvents } from '@/modules/audit/service'
import { listTickets } from '@/modules/tickets/service'
import { OPEN_TICKET_STATUSES, type TicketStatus } from '@/modules/tickets/constants'
import { Notice, Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { listOutcomes } from '@/lib/data/ops-ledger'
import { formatIsraeliPhoneDisplay, normalizePhoneDigits } from '@/lib/phone'
import { rankKnownVendors } from '@/modules/vendors/outcomes'
import { addOutcomeAction } from '../work-actions'
import { PhoneFold } from '@/components/layout/phone-fold'

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
  const preferredCount = enriched.filter((v) => v.preferred && v.active).length

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          title="ספקים"
          status={`${activeCount} פעילים · ${preferredCount} מועדפים`}
        />
        <Notice tone="neutral">
          <span className="t-body-strong block">
            מאגר מועדפים + אנשי מקצוע ממידרג
          </span>
          <span className="t-meta text-ink-2 block mt-1">
            שמרו אנשי קשר מתקלה — יופיעו מדורגים עם חיוג מהיר.
          </span>
        </Notice>
        <VendorsAdmin initialVendors={enriched} />
        <PhoneFold title="תוצאת טיפול" summary={`${listOutcomes().length}`}>
        <Panel elevated>
          <p className="t-section mb-3">תוצאת טיפול</p>
          <form action={addOutcomeAction} className="grid gap-2 md:grid-cols-2">
            <Input name="vendorName" placeholder="שם ספק" required />
            <Input name="category" placeholder="סוג תקלה" defaultValue="hvac" />
            <Input name="region" placeholder="אזור" />
            <Input name="price" type="number" placeholder="מחיר" />
            <Input name="arrival" type="number" placeholder="דקות הגעה" />
            <Input name="quality" type="number" placeholder="איכות 1-5" />
            <Input name="warranty" placeholder="אחריות" />
            <label className="t-meta flex items-center gap-2">
              <input type="checkbox" name="success" defaultChecked /> הצליח
            </label>
            <Button type="submit">שמירה</Button>
          </form>
          <ul className="mt-3 space-y-2">
            {rankKnownVendors(listOutcomes(), 'hvac').map((row) => {
              const phone = enriched.find((vendor) => vendor.name === row.vendorName)?.contact_phone
              const digits = normalizePhoneDigits(phone)
              return (
                <li key={`${row.vendorName}-${row.price}`} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="t-meta text-ink-2">
                    {row.vendorName} · {row.price ?? '—'} · איכות {row.quality ?? '—'}
                  </span>
                  {digits ? (
                    <a
                      className="t-meta text-ink"
                      href={`https://wa.me/${digits}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      וואטסאפ · {formatIsraeliPhoneDisplay(phone || digits)}
                    </a>
                  ) : (
                    <span className="t-caption text-ink-3">אין טלפון — אי אפשר לפנות</span>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
        </PhoneFold>
      </div>
    </OpsAppShell>
  )
}
