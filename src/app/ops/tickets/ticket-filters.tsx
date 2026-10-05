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
import { usePhrase } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low']

function FilterFields({
  draft,
  setDraft,
  layout = 'stack',
}: {
  draft: QueueFilters
  setDraft: (next: QueueFilters) => void
  /** stack = mobile sheet; row = desktop toolbar */
  layout?: 'stack' | 'row'
}) {
  const wrap =
    layout === 'row'
      ? 'flex flex-row flex-wrap items-end gap-2'
      : 'flex flex-col gap-4'
  const tr = usePhrase()
  const field =
    layout === 'row'
      ? 'flex min-w-[8.5rem] flex-col gap-1'
      : 'flex flex-col gap-1.5'
  const selectCls =
    't-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink'

  return (
    <div className={wrap}>
      <label className={field}>
        <span className="t-caption text-ink-2">{tr('עדיפות')}</span>
        <select
          className={selectCls}
          value={draft.priority ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              priority: e.target.value || undefined,
            })
          }
        >
          <option value="">{tr('הכל')}</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {tr(TICKET_PRIORITY_LABELS_HE[priority])}
            </option>
          ))}
        </select>
      </label>

      <label className={field}>
        <span className="t-caption text-ink-2">{tr('סטטוס')}</span>
        <select
          className={selectCls}
          value={draft.status ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              status: e.target.value || undefined,
            })
          }
        >
          <option value="">{tr('הכל')}</option>
          {OPEN_TICKET_STATUSES.map((s: TicketStatus) => (
            <option key={s} value={s}>
              {tr(TICKET_STATUS_LABELS_HE[s])}
            </option>
          ))}
        </select>
      </label>

      <label className={field}>
        <span className="t-caption text-ink-2">{tr('שיוך')}</span>
        <select
          className={selectCls}
          value={draft.tech ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              tech: e.target.value || undefined,
            })
          }
        >
          <option value="">{tr('הכל')}</option>
          <option value="none">{tr('לא משויך')}</option>
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
      {/* Desktop inline filters — horizontal row (was broken as stacked columns) */}
      <div className="hidden shrink-0 md:block">
        <FilterFields
          layout="row"
          draft={filters}
          setDraft={(next) =>
            apply({ ...next, view: filters.view || 'open', sort: 'newest' })
          }
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
                  sort: 'newest',
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
                  sort: 'newest',
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
