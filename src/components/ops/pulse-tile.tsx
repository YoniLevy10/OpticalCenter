import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PulseTone = 'neutral' | 'critical' | 'warning' | 'ok'
export type PulseMark = PulseTone | 'progress'

const toneDot: Record<PulseTone, string> = {
  critical: 'bg-[var(--signal-critical)]',
  warning: 'bg-[var(--signal-warning)]',
  ok: 'bg-[var(--signal-resolved)]',
  neutral: 'bg-[var(--signal-idle)]',
}

const toneValue: Record<PulseTone, string> = {
  critical: 'text-[var(--signal-critical)]',
  warning: 'text-[var(--signal-warning)]',
  ok: 'text-ink',
  neutral: 'text-ink',
}

const toneChip: Record<PulseMark, string> = {
  critical: 'bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]',
  warning: 'bg-[var(--signal-warning-soft)] text-[var(--signal-warning)]',
  ok: 'bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]',
  progress: 'bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]',
  neutral: 'bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]',
}

export function PulseTile({
  href,
  value,
  label,
  tone = 'neutral',
  icon: Icon,
}: {
  /** When omitted, renders a non-interactive pulse surface. */
  href?: string
  value: number | string
  label: string
  tone?: PulseTone
  /** Kept for call sites. The chip takes color only from a live alert. */
  mark?: PulseMark
  icon?: LucideIcon
}) {
  const numeric = typeof value === 'number' ? value : Number(value)
  const quiet = !Number.isFinite(numeric) || numeric === 0
  const shown = quiet ? 'neutral' : tone
  const alert = !quiet && (shown === 'critical' || shown === 'warning')
  const chip = alert
    ? toneChip[shown]
    : 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
  const className = cn(
    'flex min-h-[5.25rem] flex-col justify-center gap-1 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-1)] transition-[background,border-color,box-shadow,transform] duration-[var(--dur-1)]',
    href &&
      'group active:opacity-90 md:hover:shadow-[var(--shadow-2)] md:hover:-translate-y-0.5',
  )

  const inner = (
    <>
      <span className="flex items-center gap-2.5">
        {Icon ? (
          <span
            aria-hidden
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
              chip,
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn('size-2.5 shrink-0 rounded-full', toneDot[shown])}
          />
        )}
        <span
          className={cn(
            't-display t-num leading-none tracking-tight',
            toneValue[shown],
          )}
        >
          {value}
        </span>
      </span>
      <span className="t-caption text-ink-2">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}
