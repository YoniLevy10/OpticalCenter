import { BackButton } from '@/components/layout/back-button'
import { SkipLink } from '@/components/layout/skip-link'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * The technician is a field worker on a phone, often one-handed, often with bad
 * signal. This shell is deliberately NOT the HQ shell:
 *
 *  - no HQ navigation of any kind
 *  - no bottom tab bar (there is only one destination — the job list)
 *  - the primary action is sticky at the thumb, not buried in a sidebar
 */
export function TechShell({
  children,
  title,
  subtitle,
  backHref,
  backLabel = 'חזרה לעבודות',
  eyebrow,
  actions,
  headerActions,
  enablePullToRefresh,
}: {
  children: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  backHref?: string
  backLabel?: string
  eyebrow?: string
  actions?: React.ReactNode
  headerActions?: React.ReactNode
  enablePullToRefresh?: boolean
}) {
  const body = (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        'mx-auto w-full max-w-xl px-4 pt-5 outline-none',
        actions ? 'pb-actions scroll-pb-actions' : 'pb-8',
      )}
    >
      {children}
    </main>
  )

  return (
    <div className="dvh-screen bg-canvas text-ink">
      <SkipLink />
      <header className="safe-pt sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-start gap-2.5 px-4 py-3.5">
          {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
          <div className="min-w-0 flex-1">
            <p className="t-caption text-ink-3">{eyebrow ?? 'MaintainOS · טכנאי'}</p>
            <h1 className="t-title mt-0.5 truncate text-ink">{title}</h1>
            {subtitle ? (
              <div className="t-meta mt-0.5 truncate text-ink-2">{subtitle}</div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <LogoutButton size="touch" className="shrink-0" />
          </div>
        </div>
      </header>

      {enablePullToRefresh ? <PullToRefresh>{body}</PullToRefresh> : body}

      {actions ? (
        <div
          aria-label="פעולות עבודה"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 backdrop-blur-md"
          style={{ paddingBottom: 'calc(var(--safe-b) + 12px)' }}
        >
          <div className="mx-auto w-full max-w-xl px-4 pt-3">{actions}</div>
        </div>
      ) : null}
    </div>
  )
}

export { techHref } from '@/lib/tech-href'
