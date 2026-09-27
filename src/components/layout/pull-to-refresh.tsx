'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 72
const MAX_PULL = 96

/** Prefer the ops shell scroller; fall back to document. */
function scrollTopOf(target: EventTarget | null): number {
  if (typeof document === 'undefined') return 0
  const main = document.getElementById('main-content')
  if (main && main.scrollHeight > main.clientHeight + 1) {
    return main.scrollTop
  }
  // Nested scrollable ancestor (inbox panes, etc.)
  let el =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el)
    const oy = style.overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el.scrollTop
    }
    el = el.parentElement
  }
  return window.scrollY || document.documentElement.scrollTop || 0
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled,
  className,
}: {
  children: React.ReactNode
  onRefresh?: () => void | Promise<void>
  disabled?: boolean
  className?: string
}) {
  const router = useRouter()
  const startY = useRef(0)
  const pulling = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const runRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (onRefresh) await onRefresh()
      else router.refresh()
    } finally {
      setRefreshing(false)
      setPull(0)
    }
  }, [onRefresh, router])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return
      if (scrollTopOf(e.target) > 0) {
        pulling.current = false
        return
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      startY.current = e.touches[0]?.clientY ?? 0
      pulling.current = true
    },
    [disabled, refreshing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return
      // Abort if the user scrolled away from the top mid-gesture.
      if (scrollTopOf(e.target) > 0) {
        pulling.current = false
        setPull(0)
        return
      }
      const y = e.touches[0]?.clientY ?? 0
      const delta = y - startY.current
      // Only pull-to-refresh when dragging downward from the top.
      if (delta <= 0) {
        setPull(0)
        return
      }
      setPull(Math.min(MAX_PULL, delta))
    },
    [disabled, refreshing],
  )

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return
    pulling.current = false
    if (pull >= THRESHOLD) void runRefresh()
    else setPull(0)
  }, [pull, runRefresh])

  const active = pull > 0 || refreshing

  return (
    <div
      className={cn('relative min-h-0', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-hidden transition-[height,opacity] duration-[var(--dur-1)]',
          active ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: active ? Math.max(pull, refreshing ? 40 : 0) : 0 }}
      >
        <RefreshCw
          className={cn(
            'mt-2 h-5 w-5 text-ink-3',
            (refreshing || pull >= THRESHOLD) && 'animate-spin text-[var(--tenant)]',
          )}
        />
      </div>
      <div
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col transition-transform duration-[var(--dur-1)]"
        style={{
          transform: active
            ? `translateY(${refreshing ? 24 : pull * 0.35}px)`
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
