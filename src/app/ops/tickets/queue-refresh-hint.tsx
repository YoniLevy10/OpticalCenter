'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTicketsRealtime } from '@/hooks/use-tickets-realtime'
import { cn } from '@/lib/utils'

/** Soft realtime hint — badge + manual refresh when tickets change. */
export function QueueRefreshHint() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const onChange = useCallback(() => {
    setPending(true)
  }, [])

  const live = useTicketsRealtime(onChange)

  useEffect(() => {
    if (!pending) return
    const id = setTimeout(() => setPending(false), 60_000)
    return () => clearTimeout(id)
  }, [pending])

  function refresh() {
    setPending(false)
    router.refresh()
  }

  if (!pending && !live) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2',
        pending && 'border-[var(--tenant)]/30 bg-[var(--tenant-soft)]',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="t-caption text-ink-2">
        {pending ? 'יש עדכונים חדשים בתור' : 'מחובר לעדכונים'}
      </span>
      {pending ? (
        <Button type="button" size="sm" variant="secondary" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          רענון
        </Button>
      ) : null}
    </div>
  )
}
