import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { listTickets } from '@/modules/tickets/service'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const { tickets, backend } = await listTickets()

  return (
    <OpsShell
      title="תקלות"
      subtitle={
        backend === 'supabase'
          ? 'מקור: Supabase'
          : 'מצב דמו (זיכרון) — ללא מיגרציות'
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          שיוך טכנאי מתבצע במסך הפרטים · פורטל טכנאי ב־
          <Link href="/tech" className="underline underline-offset-2">
            /tech
          </Link>
        </p>
        <SeedDemoTicketButton />
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-right font-medium">מס׳</th>
              <th className="px-3 py-2 text-right font-medium">חנות</th>
              <th className="px-3 py-2 text-right font-medium">תיאור</th>
              <th className="px-3 py-2 text-right font-medium">עדיפות</th>
              <th className="px-3 py-2 text-right font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                  אין תקלות להצגה. השתמשו בסימולטור WhatsApp או ב־
                  <span className="font-medium text-zinc-700">תקלת הדגמה לטכנאי</span>.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-50 hover:bg-zinc-50/80"
                >
                  <td className="px-3 py-2 font-medium tabular-nums">
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className="text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {t.display_number ??
                        (t.number != null ? `OC-${t.number}` : '—')}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/ops/tickets/${t.id}`} className="block">
                      <div className="font-medium">{t.stores?.name ?? '—'}</div>
                      <div className="text-xs text-zinc-500">
                        {t.stores?.code ? `#${t.stores.code}` : ''}
                        {t.stores?.city ? ` · ${t.stores.city}` : ''}
                      </div>
                    </Link>
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-zinc-700">
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className="hover:text-zinc-900"
                    >
                      {t.description || t.category}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <PriorityDot priority={t.priority as TicketPriority} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={t.status as TicketStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </OpsShell>
  )
}
