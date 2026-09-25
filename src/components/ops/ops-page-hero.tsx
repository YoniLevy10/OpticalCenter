import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Shared page hero matching the ops dashboard — one job orientation per screen.
 */
export function OpsPageHero({
  title,
  status,
  footer,
  eyebrow = 'Optical Center · ישראל',
  showBrand = false,
  actions,
  className,
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
}) {
  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-1)] md:px-7 md:py-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 100% 0%, color-mix(in srgb, var(--tenant-soft) 70%, transparent), transparent 55%), radial-gradient(ellipse 50% 60% at 0% 100%, color-mix(in srgb, var(--signal-progress) 10%, transparent), transparent 50%)',
        }}
      />
      <div className="relative flex items-start gap-3.5">
        {showBrand ? (
          <BrandMark
            size={48}
            priority
            className="mt-0.5 rounded-[var(--radius-md)] shadow-[var(--shadow-2)]"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="t-caption text-ink-3">{eyebrow}</p>
          ) : null}
          <h1
            className={cn(
              't-display text-ink',
              eyebrow ? 'mt-1' : undefined,
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
