import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { listTickets } from '@/modules/tickets/service'
import {
  OPEN_TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>
}) {
  const sp = await searchParams
  const { tickets, backend } = await listTickets()

  const statusFilter = (sp.status || '').trim()
  const priorityFilter = (sp.priority || '').trim()
  const q = (sp.q || '').trim().toLowerCase()

  const filtered = tickets.filter((t) => {
    if (statusFilter === 'open') {
      if (
        !OPEN_TICKET_STATUSES.includes(
          t.status as (typeof OPEN_TICKET_STATUSES)[number],
        )
      )
        return false
    } else if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (q) {
      const hay = `${t.display_number ?? ''} ${t.description} ${t.stores?.name ?? ''} ${t.stores?.code ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <OpsShell
      title="תקלות"
      subtitle={
        backend === 'supabase'
          ? 'מקור: Supabase'
          : 'מצב דמו (זיכרון) — ללא מיגרציות'
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2 text-xs">
          <label className="text-zinc-600">
            סטטוס
            <select
              name="status"
              defaultValue={statusFilter}
              className="mt-1 block rounded-md border border-zinc-200 bg-white px-2 py-1.5"
            >
              <option value="">הכל</option>
              <option value="open">פתוחות</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-zinc-600">
            עדיפות
            <select
              name="priority"
              defaultValue={priorityFilter}
              className="mt-1 block rounded-md border border-zinc-200 bg-white px-2 py-1.5"
            >
              <option value="">הכל</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-zinc-600">
            חיפוש
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="OC / חנות / טקסט"
              className="mt-1 block w-40 rounded-md border border-zinc-200 px-2 py-1.5"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white"
          >
            סנן
          </button>
        </form>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                  אין תקלות להצגה לפי הסינון.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
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
