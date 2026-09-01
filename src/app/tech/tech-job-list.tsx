'use client'

import { ClipboardList } from 'lucide-react'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { EmptyState } from '@/components/ui/primitives'
import { StatusChip } from '@/components/ui/signal'
import { techHref } from '@/lib/tech-href'
import type { TechTicketRow } from '@/modules/tickets/tech'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { storeLabel } from '@/components/ops/plain-labels'

export function TechJobList({
  tickets,
  techId,
}: {
  tickets: TechTicketRow[]
  techId: string | null
}) {
  // One list, newest first — no tabs/filters/search.
  const sorted = [...tickets].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
        <EmptyState
          title="אין עבודות כרגע 🎉"
          description="כשמשייכים לך תקלה — היא תופיע כאן."
          icon={ClipboardList}
        />
      </div>
    )
  }

  return (
    <div className="-mx-4 overflow-hidden border-y border-border sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border">
      <RowList>
        {sorted.map((t) => {
          const waiting = OPEN_TICKET_STATUSES.includes(t.status as never) &&
            t.status !== 'in_progress'
          return (
            <OperationalRow
              key={t.id}
              href={techHref(`/tech/${t.id}`, techId)}
              priority={t.priority}
              leading={storeLabel(t.stores)}
              title={t.description || t.title || 'תקלה'}
              footer={
                <>
                  <StatusLabel status={t.status} />
                  <Dot />
                  <span className="t-meta text-ink-2">
                    {waiting ? 'ממתינה' : t.status === 'in_progress' ? 'בטיפול' : 'הסתיימה'}
                  </span>
                </>
              }
            />
          )
        })}
      </RowList>
    </div>
  )
}
