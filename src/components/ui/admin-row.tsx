import { cn } from '@/lib/utils'

/** Mobile list row for admin tables (non-navigating). */
export function AdminRow({
  leading,
  title,
  subtitle,
  footer,
  trailing,
  className,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[72px] flex-col justify-center gap-1 border-b border-border px-4 py-3 last:border-b-0',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {leading ? (
            <span className="t-caption t-num text-ink-3">{leading}</span>
          ) : null}
          <div className="t-body-strong text-ink">{title}</div>
          {subtitle ? (
            <div className="t-body truncate text-ink-2">{subtitle}</div>
          ) : null}
        </div>
        {trailing}
      </div>
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  )
}

export function AdminRowList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('md:hidden', className)}>{children}</div>
}
