'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * One tab language for the whole product. Views are URL-driven (link form) so
 * the operator can bookmark and share a queue; local tabs use the button form.
 * Sliding surface pill mirrors iOS UISegmentedControl.
 */

type Segment = {
  key: string
  label: string
  count?: number
  href?: string
}

function Count({ value }: { value: number }) {
  return (
    <span className={cn('t-caption t-num text-ink-3', value === 0 && 'opacity-45')}>
      {value}
    </span>
  )
}

function useSlidingPill(activeKey: string, keys: string[]) {
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false })

  const measure = useCallback(() => {
    const track = trackRef.current
    const el = itemRefs.current.get(activeKey)
    if (!track || !el) return
    const tr = track.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    // Logical inline-start offset works for both LTR and RTL.
    const x = er.left - tr.left
    setPill({ x, w: er.width, ready: true })
  }, [activeKey])

  useLayoutEffect(() => {
    measure()
  }, [measure, keys.join('|')])

  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(track)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const setItemRef = useCallback((key: string, node: HTMLElement | null) => {
    if (node) itemRefs.current.set(key, node)
    else itemRefs.current.delete(key)
  }, [])

  return { trackRef, setItemRef, pill }
}

function segmentClass(active: boolean) {
  return cn(
    'relative z-[1] t-control inline-flex h-11 min-h-[var(--tap)] min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 transition-colors duration-[var(--dur-1)] md:h-9 md:min-h-0',
    active ? 'text-ink' : 'text-ink-2 hover:text-ink',
  )
}

function Track({
  className,
  fill,
  scrollable,
  children,
  trackRef,
  pill,
  ...rest
}: {
  className?: string
  fill?: boolean
  scrollable?: boolean
  children: React.ReactNode
  trackRef: React.RefObject<HTMLDivElement | null>
  pill: { x: number; w: number; ready: boolean }
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      ref={trackRef}
      className={cn(
        'relative inline-flex gap-0.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1',
        fill && 'flex w-full',
        scrollable && 'max-w-full overflow-x-auto [scrollbar-width:none]',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 rounded-[var(--radius-sm)] bg-surface shadow-[var(--shadow-1)] transition-[transform,width] duration-[var(--dur-2)] ease-[var(--ease)]',
          !pill.ready && 'opacity-0',
        )}
        style={{
          width: pill.w,
          transform: `translateX(${pill.x}px)`,
        }}
      />
      {children}
    </div>
  )
}

export function SegmentedLinks({
  segments,
  activeKey,
  className,
  scrollable,
  fill,
}: {
  segments: Segment[]
  activeKey: string
  className?: string
  /** Horizontal scroll on narrow screens instead of wrapping. */
  scrollable?: boolean
  fill?: boolean
}) {
  const keys = segments.map((s) => s.key)
  const { trackRef, setItemRef, pill } = useSlidingPill(activeKey, keys)

  return (
    <Track
      trackRef={trackRef}
      pill={pill}
      className={className}
      scrollable={scrollable}
      fill={fill}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        return (
          <Link
            key={s.key}
            ref={(node) => setItemRef(s.key, node)}
            href={s.href ?? '#'}
            aria-current={active ? 'page' : undefined}
            className={cn(segmentClass(active), 'shrink-0', fill && 'flex-1')}
          >
            {s.label}
            {typeof s.count === 'number' ? <Count value={s.count} /> : null}
          </Link>
        )
      })}
    </Track>
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
  const keys = segments.map((s) => s.key)
  const { trackRef, setItemRef, pill } = useSlidingPill(activeKey, keys)

  return (
    <Track
      trackRef={trackRef}
      pill={pill}
      className={className}
      fill={fill}
      role={isTabs ? 'tablist' : 'group'}
      aria-orientation={isTabs ? 'horizontal' : undefined}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        const panelId = panelIdPrefix ? `${panelIdPrefix}-${s.key}` : undefined
        return (
          <button
            key={s.key}
            ref={(node) => setItemRef(s.key, node)}
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
            {typeof s.count === 'number' ? <Count value={s.count} /> : null}
          </button>
        )
      })}
    </Track>
  )
}
