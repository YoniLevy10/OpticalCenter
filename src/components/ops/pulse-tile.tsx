import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Tx } from '@/components/i18n/tx'
import { cn } from '@/lib/utils'

export type PulseTone = 'neutral' | 'critical' | 'warning' | 'ok'
export type PulseMark = PulseTone | 'progress'

const toneValue: Record<PulseTone, string> = {
  critical: 'text-primary',
  warning: 'text-[var(--signal-warning)]',
  ok: 'text-foreground',
  neutral: 'text-foreground',
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
  /** Kept for call sites. Color comes from a live alert only. */
  mark?: PulseMark
  icon?: LucideIcon
}) {
  const numeric = typeof value === 'number' ? value : Number(value)
  const quiet = !Number.isFinite(numeric) || numeric === 0
  const shown = quiet ? 'neutral' : tone
  const alert = !quiet && (shown === 'critical' || shown === 'warning')
  const className = cn(
    'flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-foreground shadow-[var(--shadow-1)] transition-colors',
    href && 'hover:border-border-strong hover:bg-accent',
  )

  const inner = (
    <>
      {Icon ? (
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-md bg-muted text-ink-2 shadow-sm"
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
      <span className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">
          <Tx text={label} />
        </span>
        <span
          className={cn(
            'text-3xl font-semibold tabular-nums tracking-tight',
            alert ? toneValue[shown] : 'text-foreground',
          )}
        >
          {value}
        </span>
      </span>
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
