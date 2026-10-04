import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Fixed page-title template for every ops / store screen.
 *
 * One composition with a reserved vertical rhythm so every screen’s title
 * band sits at the same height: eyebrow → display title → accent rule →
 * one-line status. On mobile the title collapses into the glass top bar via
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
        // Mobile: edge-to-edge large title. Desktop: soft elevated band.
        'rounded-none border-0 bg-transparent px-0 py-1 shadow-none',
        'md:rounded-[var(--radius-xl)] md:border md:border-[color-mix(in_srgb,var(--tenant)_18%,var(--border))] md:bg-[color-mix(in_srgb,var(--surface)_92%,var(--tenant-soft))] md:px-7 md:py-5 md:shadow-[var(--shadow-2)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-90 md:block"
        style={{
          background:
            'radial-gradient(ellipse 80% 90% at 100% 0%, color-mix(in srgb, var(--tenant) 10%, transparent), transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="ops-page-hero-accent pointer-events-none absolute inset-y-3 end-0 hidden w-1.5 rounded-full md:block"
      />
      <div className="ops-page-hero-row relative flex items-center gap-3.5">
        {showBrand ? (
          <BrandMark
            size={48}
            priority
            className="ops-page-hero-brand hidden shrink-0 rounded-[var(--radius-md)] shadow-[var(--shadow-2)] md:block"
          />
        ) : null}
        <div className="ops-page-hero-copy min-w-0 flex-1">
          <p
            className={cn(
              // Slot always reserved (same title Y on every page). Text shows from md up.
              'ops-page-hero-eyebrow t-caption text-ink-3 max-md:invisible',
              !eyebrow && 'invisible',
            )}
          >
            {eyebrow || '\u00a0'}
          </p>
          <h1 className="ops-page-hero-title large-title-hero-title text-ink">
            {title}
          </h1>
          <span
            aria-hidden
            className="ops-page-hero-rule mt-2 block h-1 w-10 rounded-full md:mt-2.5"
          />
          <div className="ops-page-hero-status t-body mt-1.5 truncate text-ink-2 md:mt-2">
            {status ?? '\u00a0'}
          </div>
          {footer ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-3">{footer}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="relative hidden shrink-0 items-center gap-2 self-center md:flex">
            {actions}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="relative mt-3 flex flex-wrap gap-2 md:hidden">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
