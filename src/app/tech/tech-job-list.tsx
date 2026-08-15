'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { techHref } from '@/components/layout/tech-shell'
import {
  TECH_TAB_LABELS_HE,
  filterTicketsByTab,
  snippet,
  type TechTab,
  type TechTicketRow,
} from '@/modules/tickets/tech'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'

const TABS: TechTab[] = ['new_assigned', 'in_progress', 'done']

export function TechJobList({
  tickets,
  techId,
  fromDb,
}: {
  tickets: TechTicketRow[]
  techId: string | null
  fromDb: boolean
}) {
  const [tab, setTab] = useState<TechTab>('new_assigned')
  const filtered = useMemo(() => filterTicketsByTab(tickets, tab), [tickets, tab])
  const counts = useMemo(
    () =>
      Object.fromEntries(TABS.map((t) => [t, filterTicketsByTab(tickets, t).length])) as Record<
        TechTab,
        number
      >,
    [tickets],
  )
  const assignedCount = tickets.filter((t) => techId && t.assigned_to === techId).length
  const showEmptyAssigned =
    filtered.length === 0 && tab === 'new_assigned' && assignedCount === 0

  return (
    <div className="space-y-4">
      {!techId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          חסר מזהה טכנאי. הוסיפו{' '}
          <code className="rounded bg-white/80 px-1 text-xs">?techId=UUID</code> או הגדירו{' '}
          <code className="rounded bg-white/80 px-1 text-xs">DEMO_TECH_ID</code>.
        </div>
      ) : null}

      {!fromDb ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
          מצב דמו (זיכרון) — ניתן ליצור תקלה מ־HQ עם כפתור &quot;תקלת הדגמה לטכנאי&quot;.
        </div>
      ) : null}

      <div className="flex gap-1 rounded-xl bg-zinc-200/80 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'flex-1 rounded-lg bg-white px-2 py-2 text-sm font-semibold text-zinc-900 shadow-sm'
                : 'flex-1 rounded-lg px-2 py-2 text-sm text-zinc-600'
            }
          >
            {TECH_TAB_LABELS_HE[t]}
            <span className="ms-1 text-xs text-zinc-400">({counts[t]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
          {showEmptyAssigned ? (
            <>
              <p className="text-base font-medium text-zinc-800">אין עבודות משויכות</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                מטה התחזוקה (HQ) צריך לשייך תקלות לטכנאי. אחרי השיוך הן יופיעו כאן תחת
                &quot;חדש/משויך&quot;. ניתן גם לתפוס עבודה פנויה במסך הפרטים.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">אין עבודות בקטגוריה זו.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((ticket) => (
            <li key={ticket.id}>
              <JobCard ticket={ticket} techId={techId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function JobCard({ ticket, techId }: { ticket: TechTicketRow; techId: string | null }) {
  const href = techHref(`/tech/${ticket.id}`, techId)
  const storeName = ticket.stores?.name ?? 'חנות לא ידועה'
  const desc = snippet(ticket.description || ticket.title || ticket.category)

  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{storeName}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {ticket.stores?.code ? `#${ticket.stores.code}` : ''}
            {ticket.stores?.city ? ` · ${ticket.stores.city}` : ''}
            {ticket.display_number || ticket.number != null
              ? ` · ${ticket.display_number ?? `OC-${ticket.number}`}`
              : ''}
          </p>
        </div>
        <StatusBadge status={ticket.status as TicketStatus} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">{desc || 'ללא תיאור'}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityDot priority={ticket.priority as TicketPriority} />
        {!ticket.assigned_to ? (
          <span className="text-xs font-medium text-amber-700">פנוי לתפיסה</span>
        ) : null}
      </div>
    </Link>
  )
}
