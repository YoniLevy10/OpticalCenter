'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const OPEN_PX = 148
const THRESHOLD = 56

/**
 * Mail-style swipe-to-reveal. Mobile only — desktop children render unchanged.
 * Actions sit under the row; no scale/bounce on the row itself.
 */
export function SwipeActions({
  actions,
  children,
  className,
  disabled,
}: {
  actions: React.ReactNode
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const startX = useRef<number | null>(null)
  const startOffset = useRef(0)
  const dragging = useRef(false)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      // Ignore multi-touch / mouse desktop — CSS hides this wrapper on md+
      startX.current = e.clientX
      startOffset.current = offset
      dragging.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [disabled, offset],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || startX.current == null) return
    // RTL: swipe content toward inline-end (leftward on screen) reveals actions.
    const delta = startX.current - e.clientX
    const next = Math.max(0, Math.min(OPEN_PX, startOffset.current + delta))
    setOffset(next)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    startX.current = null
    setOffset((o) => (o >= THRESHOLD ? OPEN_PX : 0))
  }, [])

  return (
    <div
      dir="ltr"
      className={cn('relative overflow-hidden md:contents', className)}
    >
      <div
        className="absolute inset-y-0 right-0 z-0 flex w-[148px] md:hidden"
        aria-hidden={offset < THRESHOLD}
      >
        {actions}
      </div>
      <div
        dir="rtl"
        className="relative z-[1] bg-surface touch-pan-y md:!transform-none"
        style={{
          transform: offset ? `translateX(${-offset}px)` : undefined,
          transition: dragging.current
            ? 'none'
            : 'transform var(--dur-2) var(--ease)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  )
}
