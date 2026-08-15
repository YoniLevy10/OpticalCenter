'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useTicketsRealtime } from '@/hooks/use-tickets-realtime'

export function TechRealtimeHint() {
  const router = useRouter()
  const onChange = useCallback(() => {
    router.refresh()
  }, [router])
  const ready = useTicketsRealtime(onChange)

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  return (
    <p className="mb-3 text-[11px] text-zinc-400">
      {ready
        ? 'מעודכן בזמן אמת (Supabase Realtime)'
        : 'רענון אוטומטי כל 30 שניות'}
    </p>
  )
}
