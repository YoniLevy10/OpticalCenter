'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import {
  activeFilterCount,
  parseQueueParams,
  queueHref,
  type QueueFilters,
} from '@/modules/tickets/queue'
import {
  OPEN_TICKET_STATUSES,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { cn } from '@/lib/utils'

const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low']

function FilterFields({
  draft,
  setDraft,
}: {
  draft: QueueFilters
  setDraft: (next: QueueFilters) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="t-caption text-ink-2">עדיפות</span>
        <select
          className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
          value={draft.priority ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              priority: e.target.value || undefined,
            })
          }
        >
          <option value="">הכל</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_LABELS_HE[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="t-caption text-ink-2">סטטוס</span>
        <select
          className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
          value={draft.status ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              status: e.target.value || undefined,
            })
          }
        >
          <option value="">הכל</option>
          {OPEN_TICKET_STATUSES.map((s: TicketStatus) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABELS_HE[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="t-caption text-ink-2">שיוך</span>
        <select
          className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
          value={draft.tech ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              tech: e.target.value || undefined,
            })
          }
        >
          <option value="">הכל</option>
          <option value="none">לא משויך</option>
        </select>
      </label>
    </div>
  )
}

export function TicketFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const filters = useMemo(() => {
    const sp = Object.fromEntries(searchParams.entries())
    return parseQueueParams(sp)
  }, [searchParams])

  const [draft, setDraft] = useState(filters)
  const count = activeFilterCount(filters)

  function apply(next: QueueFilters) {
    startTransition(() => {
      router.replace(queueHref(next), { scroll: false })
    })
    setOpen(false)
  }

  return (
    <>
      {/* Desktop inline filters */}
      <div className="hidden items-end gap-3 md:flex">
        <FilterFields
          draft={filters}
          setDraft={(next) => apply({ ...next, view: filters.view || 'open' })}
        />
      </div>

      {/* Mobile filter sheet trigger */}
      <div className="md:hidden">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-[var(--tap)] gap-1.5"
          onClick={() => {
            setDraft(filters)
            setOpen(true)
          }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          סינון
          {count > 0 ? (
            <span
              className={cn(
                't-caption t-num rounded-full bg-[var(--tenant-soft)] px-1.5 text-[var(--tenant)]',
              )}
            >
              {count}
            </span>
          ) : null}
        </Button>
      </div>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="סינון תקלות"
        detent="half"
      >
        <div className="flex flex-col gap-5">
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="touch"
              className="flex-1"
              onClick={() =>
                apply({
                  ...draft,
                  status: undefined,
                  priority: undefined,
                  tech: undefined,
                  store: filters.store,
                  view: filters.view || 'open',
                  sort: filters.sort,
                  q: filters.q,
                })
              }
            >
              נקה
            </Button>
            <Button
              type="button"
              variant="primary"
              size="touch"
              className="flex-1"
              onClick={() =>
                apply({
                  ...draft,
                  view: filters.view || 'open',
                  sort: filters.sort,
                  q: filters.q,
                  store: filters.store,
                })
              }
            >
              החל
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
