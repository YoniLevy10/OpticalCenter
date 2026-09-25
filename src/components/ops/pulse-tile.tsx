import Link from 'next/link'
import { cn } from '@/lib/utils'

export type PulseTone = 'neutral' | 'critical' | 'warning' | 'ok'

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
    'flex min-h-[5.25rem] flex-col justify-center gap-1 rounded-[var(--radius-lg)] border px-4 py-3 transition-[background,border-color,box-shadow] duration-[var(--dur-1)]',
    tone === 'critical' &&
      'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)]',
    tone === 'warning' &&
      'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)]',
    tone === 'ok' &&
      'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)]',
    tone === 'neutral' && 'border-border/80 bg-surface',
    href &&
      'group active:opacity-90 md:hover:bg-surface-sunken/40 md:hover:shadow-[var(--shadow-1)]',
  )

  const inner = (
    <>
      <span
        className={cn(
          't-display t-num leading-none tracking-tight',
          tone === 'critical' && 'text-[var(--signal-critical)]',
          tone === 'warning' && 'text-[var(--signal-warning)]',
          tone === 'ok' && 'text-[var(--signal-resolved)]',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
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
