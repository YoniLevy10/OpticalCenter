'use client'

import { useEffect, useState } from 'react'
import { formatAgeHe, getSlaView } from '@/modules/tickets/sla-display'
import { SlaValue } from '@/components/ui/signal'
import { cn } from '@/lib/utils'

/**
 * One interval for the whole page. A 30-row queue with 30 live SLA cells must
 * not create 30 timers.
 */
const subscribers = new Set<(now: Date) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(fn: (now: Date) => void) {
  subscribers.add(fn)
  if (!timer) {
    timer = setInterval(() => {
      const now = new Date()
      subscribers.forEach((s) => s(now))
    }, 30_000)
  }
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

function useTick(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    return subscribe(setNow)
  }, [])
  return now
}

type SlaInput = {
  priority?: string | null
  status?: string | null
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  created_at?: string | null
}

/**
 * Server renders the value from server time; the client re-computes on mount
 * and every 30s. `suppressHydrationWarning` covers the unavoidable one-render
 * clock skew between the two.
 */
export function LiveSla({
  ticket,
  className,
}: {
  ticket: SlaInput
  className?: string
}) {
  const now = useTick()
  const view = getSlaView({ ...ticket, now: now ?? undefined })
  return (
    <span suppressHydrationWarning>
      <SlaValue view={view} className={className} />
    </span>
  )
}

export function LiveAge({
  createdAt,
  className,
}: {
  createdAt: string
  className?: string
}) {
  const now = useTick()
  return (
    <span
      suppressHydrationWarning
      className={cn('t-meta t-num text-ink-3', className)}
    >
      {formatAgeHe(createdAt, now ?? undefined)}
    </span>
  )
}
