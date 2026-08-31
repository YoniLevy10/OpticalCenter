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
  elevated,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  /** No padding — for tables and lists that manage their own row rhythm. */
  flush?: boolean
  /** Soft lift — reserved; prefer border-only cards in Optical Clean V2. */
  elevated?: boolean
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface',
        elevated && 'shadow-[var(--shadow-1)]',
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
    <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h2 className="t-lead text-ink">{title}</h2>
        {meta ? <span className="t-caption text-ink-3">{meta}</span> : null}
      </div>
      {action}
    </header>
  )
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string
  /** Short supporting line under the title. */
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pb-2',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="t-title text-ink">{title}</h1>
          {meta ? <span className="t-meta text-ink-3">{meta}</span> : null}
        </div>
        {description ? (
          <p className="t-body mt-1.5 max-w-2xl text-ink-2">{description}</p>
        ) : null}
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
        'flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center',
        className,
      )}
    >
      <Icon className="mb-2 h-5 w-5 text-ink-3" aria-hidden strokeWidth={1.5} />
      <p className="t-body-strong text-ink">{title}</p>
      {description ? (
        <p className="t-body mt-1.5 max-w-xs text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
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
  tone?: 'neutral' | 'warning' | 'progress' | 'success' | 'critical'
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
        tone === 'success' &&
          'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]',
        tone === 'critical' &&
          'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]',
      )}
    >
      {children}
    </div>
  )
}

export function PermissionDenied({
  title = 'אין הרשאה',
  description = 'אין לך הרשאה לצפות במסך זה או לבצע פעולה זו.',
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-4 py-3">
      <p className="t-body-strong text-[var(--signal-warning)]">{title}</p>
      {description ? (
        <p className="t-body mt-1 text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function SuccessNotice({ children }: { children: React.ReactNode }) {
  return <Notice tone="success">{children}</Notice>
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
