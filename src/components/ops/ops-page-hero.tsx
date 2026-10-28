'use client'

import { usePhrase } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

/**
 * Page title used by every ops / store screen.
 * Flat shadcn header: title, one status line, optional actions.
 * On mobile the title still collapses into the top bar via LargeTitleScrollSync.
 */
export function OpsPageHero({
  title,
  status,
  footer,
  actions,
  className,
  /** @deprecated Brand lives in the shell. Kept so existing call sites stay valid. */
  showBrand: _showBrand = false,
  /** @deprecated Kept so existing call sites stay valid. */
  eyebrow: _eyebrow,
  /** @deprecated Always on — kept so existing call sites stay valid. */
  largeTitle: _largeTitle = true,
}: {
  title: string
  /** One-line orientation under the title. */
  status?: React.ReactNode
  /** Optional row below status (badges, SLA, etc.). */
  footer?: React.ReactNode
  eyebrow?: string
  showBrand?: boolean
  actions?: React.ReactNode
  className?: string
  largeTitle?: boolean
}) {
  const p = usePhrase()
  const statusText = typeof status === 'string' ? p(status) : (status ?? '\u00a0')
  return (
    <header className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="ops-page-hero-title large-title-hero-title text-foreground">
            {p(title)}
          </h1>
          <div className="ops-page-hero-status mt-1 truncate text-sm text-muted-foreground">
            {statusText}
          </div>
          {footer ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">{footer}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="hidden shrink-0 items-center gap-2 md:flex">{actions}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-3 flex flex-wrap gap-2 md:hidden">{actions}</div>
      ) : null}
    </header>
  )
}
