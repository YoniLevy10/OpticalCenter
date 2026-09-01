'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = 'open' | 'resolved'

export function QueueTabs({ active }: { active: Tab }) {
  return (
    <div
      role="tablist"
      aria-label="סינון תקלות"
      className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-surface-sunken/50 p-1"
    >
      <Link
        role="tab"
        aria-selected={active === 'open'}
        href="/ops/tickets?view=open"
        className={cn(
          'flex-1 rounded-[var(--radius-sm)] py-2.5 text-center t-control transition-colors',
          active === 'open'
            ? 'border border-border bg-surface text-ink'
            : 'text-ink-3',
        )}
      >
        פתוחות
      </Link>
      <Link
        role="tab"
        aria-selected={active === 'resolved'}
        href="/ops/tickets?view=resolved"
        className={cn(
          'flex-1 rounded-[var(--radius-sm)] py-2.5 text-center t-control transition-colors',
          active === 'resolved'
            ? 'border border-border bg-surface text-ink'
            : 'text-ink-3',
        )}
      >
        הסתיימו
      </Link>
    </div>
  )
}
