'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 72
const MAX_PULL = 96

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
      if (typeof window !== 'undefined' && window.scrollY > 0) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      startY.current = e.touches[0]?.clientY ?? 0
      pulling.current = true
    },
    [disabled, refreshing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return
      const y = e.touches[0]?.clientY ?? 0
      const delta = Math.max(0, Math.min(MAX_PULL, y - startY.current))
      if (delta > 0 && window.scrollY <= 0) {
        setPull(delta)
      }
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
      className={cn('relative', className)}
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
        className="transition-transform duration-[var(--dur-1)]"
        style={{
          transform: active ? `translateY(${refreshing ? 24 : pull * 0.35}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
