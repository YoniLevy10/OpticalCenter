import Link from 'next/link'
import { cn } from '@/lib/utils'

export type PulseTone = 'neutral' | 'critical' | 'warning' | 'ok'

const toneDot: Record<PulseTone, string> = {
  critical: 'bg-[var(--signal-critical)]',
  warning: 'bg-[var(--signal-warning)]',
  ok: 'bg-[var(--signal-resolved)]',
  neutral: 'bg-[var(--signal-idle)]',
}

const toneValue: Record<PulseTone, string> = {
  critical: 'text-[var(--signal-critical)]',
  warning: 'text-[var(--signal-warning)]',
  ok: 'text-[var(--signal-resolved)]',
  neutral: 'text-ink',
}

const toneSurface: Record<PulseTone, string> = {
  critical:
    'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
  warning:
    'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
  ok: 'border-[var(--signal-resolved)]/25 bg-[var(--signal-resolved-soft)]',
  neutral: 'border-border/80 bg-surface',
}

export function PulseTile({
  href,
  value,
  label,
  tone = 'neutral',
}: {
  /** When omitted, renders a non-interactive pulse surface. */
  href?: string
  value: number | string
  label: string
  tone?: PulseTone
}) {
  const className = cn(
    'flex min-h-[5.25rem] flex-col justify-center gap-1 rounded-[var(--radius-lg)] border px-4 py-3 shadow-[var(--shadow-1)] transition-[background,border-color,box-shadow,transform] duration-[var(--dur-1)]',
    toneSurface[tone],
    href &&
      'group active:opacity-90 md:hover:shadow-[var(--shadow-2)] md:hover:-translate-y-0.5',
  )

  const inner = (
    <>
      <span className="flex items-center gap-2">
        {tone !== 'neutral' && (
          <span
            aria-hidden
            className={cn('size-1.5 shrink-0 rounded-full', toneDot[tone])}
          />
        )}
        <span
          className={cn(
            't-display t-num leading-none tracking-tight',
            toneValue[tone],
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
