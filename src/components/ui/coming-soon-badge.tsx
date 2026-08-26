'use client'

import { cn } from '@/lib/utils'

/** Marks features that are partially shipped — no silent 404. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        't-caption inline-flex shrink-0 rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-ink-3',
        className,
      )}
    >
      בקרוב
    </span>
  )
}
