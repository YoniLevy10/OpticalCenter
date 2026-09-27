import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Shared page hero matching the ops dashboard — one job orientation per screen.
 * On mobile, pairs with LargeTitleScrollSync: the display title collapses into
 * the glass top bar as the operator scrolls.
 */
export function OpsPageHero({
  title,
  status,
  footer,
  eyebrow = 'Optical Center · ישראל',
  showBrand = false,
  actions,
  className,
  largeTitle = false,
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
  /** Mobile large-title collapse (dashboard / tickets / stores). */
  largeTitle?: boolean
}) {
  return (
    <header
      className={cn(
        'relative overflow-hidden',
        largeTitle
          ? 'rounded-none border-0 bg-transparent px-0 py-1 shadow-none md:rounded-[var(--radius-xl)] md:border md:border-border/70 md:bg-surface md:px-7 md:py-6 md:shadow-[var(--shadow-1)]'
          : 'rounded-[var(--radius-xl)] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-1)] md:px-7 md:py-6',
        className,
      )}
    >
      <div className="relative flex items-start gap-3.5">
        {showBrand ? (
          <BrandMark
            size={48}
            priority
            className="mt-0.5 hidden rounded-[var(--radius-md)] shadow-[var(--shadow-2)] md:block"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p
              className={cn(
                't-caption text-ink-3',
                largeTitle && 'md:block',
                largeTitle && 'hidden',
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              't-display text-ink',
              eyebrow && !largeTitle ? 'mt-1' : undefined,
              largeTitle && 'text-[1.75rem] leading-tight tracking-tight md:mt-1 md:text-[length:inherit] md:leading-[inherit]',
              largeTitle && 'large-title-hero-title',
            )}
          >
            {title}
          </h1>
          {status ? (
            <div className="t-body mt-1.5 max-w-xl whitespace-pre-wrap text-ink-2">
              {status}
            </div>
          ) : null}
          {footer ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">{footer}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="relative hidden shrink-0 items-center gap-2 md:flex">
            {actions}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="relative mt-4 flex flex-wrap gap-2 md:hidden">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
