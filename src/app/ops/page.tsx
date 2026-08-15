import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { Card } from '@/components/ui/primitives'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { StatusBadge, PriorityDot } from '@/components/ui/badges'


export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const [{ stores, fromDb: storesFromDb }, { tickets, backend }] =
    await Promise.all([fetchStores(), listTickets()])

  const open = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(
      t.status as (typeof OPEN_TICKET_STATUSES)[number],
    ),
  )
  const critical = open.filter(
    (t) => t.priority === 'critical' || t.priority === 'high',
  )

  return (
    <OpsShell
      pathname="/ops"
      title="סקירה"
      subtitle={
        backend === 'supabase' && storesFromDb
          ? 'נתונים חיים · Optical Center ישראל'
          : 'מצב דמו'
      }
      actions={<SeedDemoTicketButton />}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'פתוחות', value: open.length },
          {
            label: 'גבוה / קריטי',
            value: critical.length,
            attention: critical.length > 0,
          },
          { label: 'סה״כ תקלות', value: tickets.length },
          { label: 'חנויות', value: stores.length },
        ].map((kpi) => (
          <Card key={kpi.label} className="px-3 py-3">
            <div className="text-[11px] text-muted">{kpi.label}</div>
            <div
              className={`mt-1 text-[24px] font-semibold tabular-nums tracking-tight ${
                kpi.attention ? 'text-danger' : 'text-foreground'
              }`}
            >
              {kpi.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-medium">דורש תשומת לב</h2>
            <Link
              href="/ops/tickets?status=open"
              className="text-[12px] text-muted hover:text-foreground"
            >
              כל התקלות
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {tickets.slice(0, 6).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/ops/tickets/${t.id}`}
                  className="flex items-center gap-3 px-4 py-[11px] transition-colors hover:bg-canvas"
                >
                  <PriorityDot priority={t.priority} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">
                        {t.display_number ?? `OC-${t.number}`}
                      </span>
                      <span className="truncate text-muted">
                        {t.stores?.name ?? '—'}
                      </span>
                    </div>
                    <p className="truncate text-[12px] text-muted">
                      {t.description}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
            {tickets.length === 0 ? (
              <li className="px-4 py-10 text-center text-[13px] text-muted">
                אין תקלות עדיין
              </li>
            ) : null}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="text-[14px] font-medium">זיהוי חנות</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            QR / NFC / קוד מספרי (`172`) → WhatsApp → קריאה. עדכוני סטטוס נשארים
            ב־HQ ובפורטל הטכנאי — לא ב־WhatsApp.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/ops/stores"
              className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[12px] hover:bg-canvas"
            >
              חנויות וקישורים
            </Link>
            <Link
              href="/ops/settings"
              className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[12px] hover:bg-canvas"
            >
              הגדרות / סימולטור
            </Link>
            <Link
              href="/tech"
              className="rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-[12px] hover:bg-canvas"
            >
              פורטל טכנאי
            </Link>
          </div>
        </Card>
      </div>
    </OpsShell>
  )
}
