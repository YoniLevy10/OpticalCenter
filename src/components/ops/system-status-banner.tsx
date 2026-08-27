'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type HealthLevel = 'ok' | 'partial' | 'issue' | 'unknown'

type HealthPayload = {
  ok?: boolean
  backend?: string
  status?: string
}

const LEVEL_LABEL: Record<HealthLevel, string> = {
  ok: 'הכול עובד',
  partial: 'חלקי',
  issue: 'תקלה',
  unknown: 'בודק…',
}

function levelFromPayload(data: HealthPayload, httpOk: boolean): HealthLevel {
  if (!httpOk || data.ok === false) return 'issue'
  if (data.backend === 'memory') return 'partial'
  if (data.ok === true || data.backend === 'supabase') return 'ok'
  return 'partial'
}

export function SystemStatusBanner({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const [level, setLevel] = useState<HealthLevel>('unknown')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = (await res.json().catch(() => ({}))) as HealthPayload
        if (!cancelled) setLevel(levelFromPayload(data, res.ok))
      } catch {
        if (!cancelled) setLevel('issue')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const label = LEVEL_LABEL[level]

  return (
    <Link
      href="/ops/status"
      aria-label={`סטטוס מערכת: ${label}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-md)] transition-colors duration-[var(--dur-1)]',
        compact
          ? 'px-2.5 py-1.5 hover:bg-surface-sunken/60'
          : 'border border-border bg-surface px-3.5 py-2.5 shadow-[var(--shadow-1)] hover:bg-surface-sunken/40',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          level === 'ok' && 'bg-[var(--signal-resolved)]',
          level === 'partial' && 'bg-[var(--signal-warning)]',
          level === 'issue' && 'bg-[var(--signal-critical)]',
          level === 'unknown' && 'bg-[var(--signal-idle)]',
        )}
      />
      <span
        className={cn(
          compact ? 't-caption' : 't-body',
          level === 'ok' && 'text-ink-2',
          level === 'partial' && 'text-[var(--signal-warning)]',
          level === 'issue' && 'text-[var(--signal-critical)]',
          level === 'unknown' && 'text-ink-3',
        )}
      >
        {compact ? label : `סטטוס מערכת · ${label}`}
      </span>
    </Link>
  )
}
