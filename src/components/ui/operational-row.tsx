import Link from 'next/link'
import { cn } from '@/lib/utils'
import { priorityEdgeClass, priorityRowClass } from '@/components/ui/signal'

/**
 * The mobile counterpart to a table row. Full-bleed with dividers — cards would
 * cost ~32px of horizontal padding per item and cut visible tickets by a third.
 *
 * Three lines, in decreasing order of decision value:
 *   1  identity + live SLA
 *   2  what is broken
 *   3  where + status + owner
 */
export function OperationalRow({
  href,
  priority,
  leading,
  trailing,
  title,
  subtitle,
  footer,
  className,
}: {
  href: string
  priority?: string | null
  /** Ticket number or equivalent identity. */
  leading: React.ReactNode
  /** Live SLA. */
  trailing?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[76px] flex-col justify-center gap-1 px-4 py-3 ps-5 transition-colors duration-[var(--dur-1)] active:bg-canvas md:hover:bg-canvas',
        priorityEdgeClass(priority),
        priorityRowClass(priority),
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-caption t-num text-ink-3">{leading}</span>
        {trailing}
      </div>

      <span className="t-lead line-clamp-2 text-ink">{title}</span>

      {subtitle ? (
        <span className="t-body truncate text-ink-2">{subtitle}</span>
      ) : null}

      {footer ? (
        <div className="mt-0.5 flex items-center gap-2">{footer}</div>
      ) : null}
    </Link>
  )
}

export function RowList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('divide-y divide-border bg-surface', className)}>
      {children}
    </div>
  )
}

/** Quiet inline separator for the row footer line. */
export function Dot() {
  return (
    <span aria-hidden className="t-caption text-ink-3">
      ·
    </span>
  )
}
