import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Fixed page-title template for every ops / store screen.
 *
 * One composition: eyebrow → bold display title → one-line status → optional
 * footer / actions. On mobile the title collapses into the glass top bar via
 * LargeTitleScrollSync (`--large-title-progress`).
 */
export function OpsPageHero({
  title,
  status,
  footer,
  eyebrow = 'Optical Center · ישראל',
  showBrand = false,
  actions,
  className,
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
  return (
    <header
      className={cn(
        'ops-page-hero relative overflow-hidden',
        // Mobile: edge-to-edge large title (iOS-style). Desktop: soft elevated band.
        'rounded-none border-0 bg-transparent px-0 py-1 shadow-none',
        'md:rounded-[var(--radius-xl)] md:border md:border-border/70 md:bg-surface md:px-7 md:py-6 md:shadow-[var(--shadow-1)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="ops-page-hero-accent pointer-events-none absolute inset-y-3 end-0 hidden w-1 rounded-full md:block"
      />
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
            <p className="t-caption hidden text-ink-3 md:block">{eyebrow}</p>
          ) : null}
          <h1 className="ops-page-hero-title large-title-hero-title text-ink md:mt-1">
            {title}
          </h1>
          <span
            aria-hidden
            className="ops-page-hero-rule mt-2.5 block h-1 w-10 rounded-full md:mt-3"
          />
          {status ? (
            <div className="t-body mt-2 max-w-xl whitespace-pre-wrap text-ink-2 md:mt-2.5">
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
