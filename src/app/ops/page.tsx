import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'

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
      title="לוח בקרה"
      subtitle={
        backend === 'supabase' && storesFromDb
          ? 'נתונים חיים מ־Supabase'
          : 'מצב דמו (זיכרון) — ללא מיגרציות Supabase'
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
            <Link
              href="/ops/tickets"
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              הכל
            </Link>
          </div>
          {tickets.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-500">
              עדיין אין תקלות.{' '}
              <Link href="/ops/simulator" className="underline underline-offset-2">
                סימולטור WhatsApp
              </Link>{' '}
              או{' '}
              <Link
                href="/api/demo/seed-ticket"
                className="underline underline-offset-2"
              >
                תקלת הדגמה
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {tickets.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ops/tickets/${t.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50"
                  >
                    <span className="truncate">
                      <span className="font-medium tabular-nums">
                        {t.display_number ??
                          (t.number != null ? `OC-${t.number}` : '—')}
                      </span>
                      <span className="text-zinc-500">
                        {' '}
                        · {t.stores?.name ?? 'חנות'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {t.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-medium">זיהוי חנות</h2>
            <Link
              href="/ops/stores"
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
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
