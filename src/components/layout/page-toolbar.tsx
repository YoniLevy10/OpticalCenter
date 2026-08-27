import { BackButton } from '@/components/layout/back-button'
import { RefreshButton } from '@/components/layout/refresh-button'
import { cn } from '@/lib/utils'

export function PageToolbar({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  onRefresh,
  showRefresh,
  className,
}: {
  backHref?: string
  backLabel?: string
  title?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  onRefresh?: () => void | Promise<void>
  showRefresh?: boolean
  className?: string
}) {
  if (!backHref && !title && !actions && !showRefresh) return null

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 md:hidden',
        className,
      )}
    >
      {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
      {title ? (
        <div className="min-w-0 flex-1">
          {/* Decorative title — page heroes own the sole <h1> */}
          <p className="t-title text-ink">{title}</p>
          {meta ? <p className="t-meta text-ink-3">{meta}</p> : null}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex items-center gap-1">
        {showRefresh ? <RefreshButton onRefresh={onRefresh} /> : null}
        {actions}
      </div>
    </div>
  )
}
