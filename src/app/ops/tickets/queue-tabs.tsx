'use client'

import { useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { usePhrase } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'
import {
  queueHref,
  type QueueFilters,
  type QueueView,
} from '@/modules/tickets/queue'

type Tab = Extract<
  QueueView,
  'open' | 'attention' | 'urgent' | 'stuck' | 'resolved'
>

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'פתוחות' },
  { key: 'attention', label: 'דורש תשומת לב' },
  { key: 'urgent', label: 'דחופות' },
  { key: 'stuck', label: 'תקועות' },
  { key: 'resolved', label: 'הסתיימו' },
]

/**
 * Queue view control — native tab semantics (not Next Link) so
 * role=tab is never stripped; sliding pill matches Segmented craft.
 * Preserves search/store filters when switching views.
 */
export function QueueTabs({
  active,
  filters = {},
}: {
  active: Tab
  filters?: Partial<QueueFilters>
}) {
  const router = useRouter()
  const p = usePhrase()
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false })

  useLayoutEffect(() => {
    const track = trackRef.current
    const el = itemRefs.current.get(active)
    if (!track || !el) return
    const tr = track.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setPill({ x: er.left - tr.left, w: er.width, ready: true })
  }, [active])

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={p('סינון תקלות')}
      aria-orientation="horizontal"
      className="relative flex w-full gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1"
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-surface shadow-[var(--shadow-1)] transition-[transform,width] duration-[var(--dur-2)] ease-[var(--ease)]',
          !pill.ready && 'opacity-0',
        )}
        style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
      />
      {TAB_LABELS.map((tab) => {
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              if (node) itemRefs.current.set(tab.key, node)
              else itemRefs.current.delete(tab.key)
            }}
            onClick={() =>
              router.push(queueHref(filters, { view: tab.key }))
            }
            className={cn(
              'relative z-[1] t-control flex min-w-[4.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-2.5 transition-colors duration-[var(--dur-1)]',
              selected ? 'text-ink' : 'text-ink-3',
            )}
          >
            {p(tab.label)}
          </button>
        )
      })}
    </div>
  )
}
