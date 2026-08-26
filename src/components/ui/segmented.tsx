import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * One tab language for the whole product. Views are URL-driven (link form) so
 * the operator can bookmark and share a queue; local tabs use the button form.
 */

type Segment = {
  key: string
  label: string
  count?: number
  href?: string
}

function segmentClass(active: boolean) {
  return cn(
    't-control inline-flex h-11 min-h-[var(--tap)] min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 transition-all duration-[var(--dur-1)] md:h-9 md:min-h-0',
    active
      ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
      : 'text-ink-2 hover:bg-[var(--surface-sunken)]/40 hover:text-ink',
  )
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        't-caption t-num',
        active ? 'text-ink-3' : 'text-ink-3',
        value === 0 && 'opacity-45',
      )}
    >
      {value}
    </span>
  )
}

export function SegmentedLinks({
  segments,
  activeKey,
  className,
  scrollable,
}: {
  segments: Segment[]
  activeKey: string
  className?: string
  /** Horizontal scroll on narrow screens instead of wrapping. */
  scrollable?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1',
        scrollable && 'max-w-full overflow-x-auto [scrollbar-width:none]',
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        return (
          <Link
            key={s.key}
            href={s.href ?? '#'}
            aria-current={active ? 'page' : undefined}
            className={cn(segmentClass(active), 'shrink-0')}
          >
            {s.label}
            {typeof s.count === 'number' ? (
              <Count value={s.count} active={active} />
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}

export function SegmentedButtons({
  segments,
  activeKey,
  onChange,
  className,
  fill,
  panelIdPrefix,
  mode = 'toggle',
}: {
  segments: Segment[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
  /** Stretch to full width — used on technician mobile. */
  fill?: boolean
  panelIdPrefix?: string
  /** Use WAI-ARIA tabs when tab panels exist in the DOM. */
  mode?: 'tabs' | 'toggle'
}) {
  const isTabs = mode === 'tabs' && panelIdPrefix

  return (
    <div
      role={isTabs ? 'tablist' : 'group'}
      aria-orientation={isTabs ? 'horizontal' : undefined}
      className={cn(
        'inline-flex gap-0.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1',
        fill && 'flex w-full',
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        const panelId = panelIdPrefix ? `${panelIdPrefix}-${s.key}` : undefined
        return (
          <button
            key={s.key}
            type="button"
            role={isTabs ? 'tab' : undefined}
            id={isTabs ? `${panelIdPrefix}-tab-${s.key}` : undefined}
            aria-selected={isTabs ? active : undefined}
            aria-pressed={!isTabs ? active : undefined}
            aria-controls={isTabs ? panelId : undefined}
            tabIndex={isTabs ? (active ? 0 : -1) : undefined}
            onClick={() => onChange(s.key)}
            className={cn(segmentClass(active), fill && 'flex-1')}
          >
            {s.label}
            {typeof s.count === 'number' ? (
              <Count value={s.count} active={active} />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
