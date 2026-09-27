'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = 'open' | 'resolved'

export function QueueTabs({
  active,
  q,
  storeCode,
}: {
  active: Tab
  q?: string
  storeCode?: string
}) {
  function href(view: Tab) {
    const params = new URLSearchParams()
    params.set('view', view)
    if (q?.trim()) params.set('q', q.trim())
    if (storeCode) params.set('store', storeCode)
    return `/ops/tickets?${params.toString()}`
  }

  return (
    <div
      role="tablist"
      aria-label="סינון תקלות"
      className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken/50 p-1"
    >
      <Link
        role="tab"
        aria-selected={active === 'open'}
        href={href('open')}
        className={cn(
          'flex-1 rounded-[var(--radius-sm)] py-2.5 text-center t-control transition-colors',
          active === 'open'
            ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
            : 'text-ink-3',
        )}
      >
        פתוחות
      </Link>
      <Link
        role="tab"
        aria-selected={active === 'resolved'}
        href={href('resolved')}
        className={cn(
          'flex-1 rounded-[var(--radius-sm)] py-2.5 text-center t-control transition-colors',
          active === 'resolved'
            ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
            : 'text-ink-3',
        )}
      >
        הסתיימו
      </Link>
    </div>
  )
}
