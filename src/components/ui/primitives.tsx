import { cn } from '@/lib/utils'

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'danger' | 'warning' | 'success' | 'info'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'neutral' && 'bg-canvas text-muted',
        tone === 'accent' && 'bg-accent-soft text-accent',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'success' && 'bg-success-soft text-success',
        tone === 'info' && 'bg-info-soft text-info',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusDot({
  tone = 'neutral',
  label,
}: {
  tone?: 'neutral' | 'accent' | 'danger' | 'warning' | 'success' | 'info'
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          tone === 'neutral' && 'bg-border-strong',
          tone === 'accent' && 'bg-accent',
          tone === 'danger' && 'bg-danger',
          tone === 'warning' && 'bg-warning',
          tone === 'success' && 'bg-success',
          tone === 'info' && 'bg-info',
        )}
      />
      <span className="text-foreground">{label}</span>
    </span>
  )
}

export function FilterChip({
  active,
  children,
  href,
}: {
  active?: boolean
  children: React.ReactNode
  href: string
}) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex h-8 max-md:min-h-[var(--touch-min)] items-center rounded-full border px-3 text-[12px] transition-colors',
        active
          ? 'border-accent/30 bg-accent-soft text-accent'
          : 'border-border bg-surface text-muted hover:text-foreground',
      )}
    >
      {children}
    </a>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-14 text-center">
      <p className="text-[14px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-canvas', className)}
    />
  )
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SurfaceTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  )
}
