'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { techHref } from '@/components/layout/tech-shell'
import { EmptyState } from '@/components/ui/primitives'
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
      Object.fromEntries(
        TABS.map((t) => [t, filterTicketsByTab(tickets, t).length]),
      ) as Record<TechTab, number>,
    [tickets],
  )

  return (
    <div className="space-y-4">
      {!techId ? (
        <div className="rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          חסר techId — הוסיפו בשורת הכתובת או DEMO_TECH_ID
        </div>
      ) : null}

      {!fromDb ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-[13px] text-muted">
          מצב דמו (זיכרון)
        </div>
      ) : null}

      <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-canvas p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'flex min-h-[var(--touch-min)] flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-surface px-2 text-[13px] font-medium text-foreground shadow-sm'
                : 'flex min-h-[var(--touch-min)] flex-1 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[13px] text-muted'
            }
          >
            {TECH_TAB_LABELS_HE[t]}
            <span className="ms-1 text-[11px] text-faint">({counts[t]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="אין עבודות בטאב זה" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={techHref(`/tech/${t.id}`, techId)}
                className="block rounded-[var(--radius-lg)] border border-border bg-surface p-3 transition-colors hover:bg-canvas"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium tabular-nums">
                    {t.display_number ?? `OC-${t.number}`}
                  </span>
                  <StatusBadge status={t.status as TicketStatus} />
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {t.stores?.name ?? '—'}
                  {t.stores?.code ? ` · #${t.stores.code}` : ''}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <PriorityDot priority={t.priority as TicketPriority} />
                  <span className="truncate text-[12px] text-faint">
                    {snippet(t.description || t.title || '')}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
