'use client'

import { useRouter } from 'next/navigation'
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

/** Phone uses one menu. Desktop keeps a single row of tabs. */
export function QueueTabs({
  active,
  filters = {},
}: {
  active: Tab
  filters?: Partial<QueueFilters>
}) {
  const router = useRouter()
  const p = usePhrase()

  function go(view: Tab) {
    router.push(queueHref(filters, { view }))
  }

  return (
    <>
      <label className="block md:hidden">
        <span className="sr-only">{p('סינון תקלות')}</span>
        <select
          aria-label={p('סינון תקלות')}
          className="h-12 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
          value={active}
          onChange={(event) => go(event.target.value as Tab)}
        >
          {TAB_LABELS.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {p(tab.label)}
            </option>
          ))}
        </select>
      </label>
      <div
        role="tablist"
        aria-label={p('סינון תקלות')}
        aria-orientation="horizontal"
        className="hidden w-full min-w-0 gap-1 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1 md:flex"
      >
        {TAB_LABELS.map((tab) => {
          const selected = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(tab.key)}
              className={cn(
                't-control flex h-10 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-2 text-center',
                selected ? 'bg-surface text-ink shadow-[var(--shadow-1)]' : 'text-ink-3',
              )}
            >
              {p(tab.label)}
            </button>
          )
        })}
      </div>
    </>
  )
}
