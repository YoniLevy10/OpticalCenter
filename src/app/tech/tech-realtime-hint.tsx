'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTicketsRealtime } from '@/hooks/use-tickets-realtime'
import { cn } from '@/lib/utils'

/**
 * Field workers frequently have poor signal. Connection state is quiet metadata,
 * not a banner — until the device actually goes offline, when it becomes a
 * warning the technician needs to see before tapping "resolve".
 */
export function TechRealtimeHint() {
  const router = useRouter()
  const [online, setOnline] = useState(true)

  const onChange = useCallback(() => {
    router.refresh()
  }, [router])
  const ready = useTicketsRealtime(onChange)

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine)
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!online) {
    return (
      <div className="t-body mb-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-3 py-2 text-[var(--signal-warning)]">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-[var(--signal-warning)]"
        />
        אין חיבור לרשת — עדכונים יישלחו כשהחיבור יחזור
      </div>
    )
  }

  return (
    <p className="t-caption mb-3 flex items-center gap-1.5 text-ink-3">
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          ready ? 'bg-[var(--signal-resolved)]' : 'bg-border-strong',
        )}
      />
      {ready ? 'מעודכן בזמן אמת' : 'רענון כל 30 שניות'}
    </p>
  )
}
