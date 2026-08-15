import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { fetchTickets } from '@/modules/stores/data'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const { tickets, fromDb } = await fetchTickets()

  return (
    <OpsShell
      title="תקלות"
      subtitle={fromDb ? 'מקור: Supabase' : 'אין נתונים ב־DB עדיין'}
    >
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
                  אין תקלות להצגה. אחרי חיבור המיגרציות ודיווח WhatsApp הן יופיעו כאן.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50/80">
                  <td className="px-3 py-2 font-medium tabular-nums">
                    {t.display_number ?? (t.number != null ? `OC-${t.number}` : '—')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.stores?.name ?? '—'}</div>
                    <div className="text-xs text-zinc-500">
                      {t.stores?.code ? `#${t.stores.code}` : ''}
                      {t.stores?.city ? ` · ${t.stores.city}` : ''}
                    </div>
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-zinc-700">
                    {t.description || t.category}
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
