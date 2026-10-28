'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const POLL_MS = 1500

/**
 * Keeps the open screen on the internal server. A cursor change — a new
 * fault, a status move, an approval — refreshes the server render.
 */
export function LiveSync() {
  const router = useRouter()

  useEffect(() => {
    let stopped = false
    let seen: string | null = null
    let refreshTimer: number | null = null

    function scheduleRefresh() {
      if (refreshTimer != null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        if (!stopped && document.visibilityState === 'visible') router.refresh()
      }, 200)
    }

    async function tick() {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/live', { cache: 'no-store', credentials: 'same-origin' })
        if (!res.ok) return
        const json = (await res.json()) as { stamp?: string; cursor?: string }
        const next = json.stamp ?? json.cursor
        if (!next) return
        if (seen === null) {
          seen = next
          return
        }
        if (seen !== next) {
          seen = next
          scheduleRefresh()
        }
      } catch {
        /* The next tick retries. A missed poll must not blank the screen. */
      }
    }

    const poll = window.setInterval(() => void tick(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    void tick()

    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null =
      null
    let supabase: ReturnType<typeof createClient> | null = null
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        supabase = createClient()
        channel = supabase
          .channel(`live-${crypto.randomUUID()}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tickets' },
            () => void tick(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ticket_events' },
            () => void tick(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ticket_messages' },
            () => void tick(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'inbox_messages' },
            () => void tick(),
          )
          .subscribe()
      } catch {
        channel = null
      }
    }

    return () => {
      stopped = true
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      if (refreshTimer != null) window.clearTimeout(refreshTimer)
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
