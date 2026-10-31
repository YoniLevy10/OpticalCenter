import Link from 'next/link'
import { Tx } from '@/components/i18n/tx'
import { cn } from '@/lib/utils'
import type { PulseTone } from '@/components/ops/pulse-tile'

/**
 * Thin peer-metrics band for the ops dashboard — one elevated strip,
 * not a wall of PulseTile cards. Click → existing queue href.
 */
export type StatStripItem = {
  href: string
  value: number
  label: string
  tone?: PulseTone
}

const toneValue: Record<PulseTone, string> = {
  critical: 'text-[var(--signal-critical)]',
  warning: 'text-[var(--signal-warning)]',
  ok: 'text-foreground',
  neutral: 'text-foreground',
}

export function StatStrip({
  items,
  className,
}: {
  items: StatStripItem[]
  className?: string
}) {
  return (
    <section
      aria-label="מדדים"
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border shadow-[var(--shadow-1)]',
        className,
      )}
    >
      <div
        className={cn(
          'grid gap-px',
          items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        {items.map((item) => (
          <StatCell key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}

function StatCell({ href, value, label, tone = 'neutral' }: StatStripItem) {
  const quiet = value === 0
  const shown = quiet ? 'neutral' : tone
  const alert = !quiet && (shown === 'critical' || shown === 'warning')

  return (
    <Link
      href={href}
      className="flex min-h-11 items-baseline justify-between gap-2 bg-surface px-3.5 py-2.5 transition-colors hover:bg-surface-sunken/50 sm:min-h-10"
    >
      <span className="t-caption text-ink-2">
        <Tx text={label} />
      </span>
      <span
        className={cn(
          't-num text-base font-semibold tabular-nums tracking-tight',
          alert ? toneValue[shown] : 'text-ink',
        )}
      >
        {value}
      </span>
    </Link>
  )
}
