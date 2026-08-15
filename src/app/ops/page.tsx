import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { fetchStores, fetchTickets } from '@/modules/stores/data'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function OpsDashboardPage() {
  const [{ stores, fromDb: storesFromDb }, { tickets, fromDb: ticketsFromDb }] =
    await Promise.all([fetchStores(), fetchTickets()])

  const open = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status as (typeof OPEN_TICKET_STATUSES)[number]),
  )
  const critical = open.filter((t) => t.priority === 'critical' || t.priority === 'high')
  const fromDb = storesFromDb && ticketsFromDb

  return (
    <OpsShell
      title="לוח בקרה"
      subtitle={
        fromDb
          ? 'נתונים חיים מ־Supabase'
          : 'מצב הדגמה — יש להריץ מיגרציות Supabase כדי לחבר DB'
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'תקלות פתוחות', value: open.length },
          { label: 'גבוה / קריטי', value: critical.length },
          { label: 'חנויות', value: stores.length },
          { label: 'סה״כ תקלות', value: tickets.length },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-3"
          >
            <div className="text-xs text-zinc-500">{kpi.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-medium">תקלות אחרונות</h2>
            <Link href="/ops/tickets" className="text-xs text-zinc-500 hover:text-zinc-800">
              הכל
            </Link>
          </div>
          <div className="px-4 py-6 text-sm text-zinc-500">
            {tickets.length === 0
              ? 'עדיין אין תקלות. בשלב הבא נחבר WhatsApp / סימולטור דיווח.'
              : null}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-medium">זיהוי חנות</h2>
            <Link href="/ops/stores" className="text-xs text-zinc-500 hover:text-zinc-800">
              חנויות ו־QR/NFC
            </Link>
          </div>
          <ul className="space-y-2 px-4 py-4 text-sm text-zinc-600">
            <li>QR לכל חנות → WhatsApp עם קוד החנות</li>
            <li>NFC → אותו לינק כמו ה־QR</li>
            <li>שיחה ידנית עם קוד מספרי (למשל 172)</li>
            <li>מספר WhatsApp נפרד לכל מדינה (פיילוט: ישראל)</li>
          </ul>
        </section>
      </div>
    </OpsShell>
  )
}
