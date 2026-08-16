import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Containers are the last resort. Prefer type and space, then a divider, then
 * a hairline, and only then a Panel.
 */

export function Panel({
  children,
  className,
  flush,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  /** No padding — for tables and lists that manage their own row rhythm. */
  flush?: boolean
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-1)]',
        !flush && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-5">
      <div className="flex items-baseline gap-2">
        <h2 className="t-section text-ink">{title}</h2>
        {meta ? <span className="t-caption text-ink-3">{meta}</span> : null}
      </div>
      {action}
    </header>
  )
}

export function PageHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-2',
        className,
      )}
    >
      <div className="flex items-baseline gap-3">
        <h1 className="t-title text-ink">{title}</h1>
        {meta ? <span className="t-meta text-ink-3">{meta}</span> : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: typeof Inbox
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-ink-3 ring-1 ring-border">
        <Icon className="h-6 w-6" aria-hidden strokeWidth={1.5} />
      </div>
      <p className="t-body-strong text-ink">{title}</p>
      {description ? (
        <p className="t-body mt-2 max-w-xs text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'משהו השתבש',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] px-4 py-3">
      <p className="t-body-strong text-[var(--signal-critical)]">{title}</p>
      {description ? (
        <p className="t-body mt-1 text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning' | 'progress'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        't-body rounded-[var(--radius-md)] border px-4 py-2.5',
        tone === 'neutral' && 'border-border bg-surface text-ink-2',
        tone === 'warning' &&
          'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] text-[var(--signal-warning)]',
        tone === 'progress' &&
          'border-border bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]',
      )}
    >
      {children}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('skeleton-shimmer rounded-[var(--radius-sm)]', className)}
    />
  )
}

/** Skeleton that mirrors the real queue geometry rather than a spinner. */
export function RowSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4"
          style={{ height: 'var(--row-h)' }}
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="hidden h-3 flex-1 md:block" />
          <Skeleton className="hidden h-3 w-20 md:block" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

export function KeyValue({
  label,
  children,
  ltr,
}: {
  label: string
  children: React.ReactNode
  ltr?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="t-body shrink-0 text-ink-2">{label}</dt>
      <dd
        dir={ltr ? 'ltr' : undefined}
        className={cn('t-body text-end text-ink', ltr && 't-num')}
      >
        {children}
      </dd>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-t border-border', className)} />
}
