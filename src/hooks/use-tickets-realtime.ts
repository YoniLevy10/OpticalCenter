'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Soft realtime: listen to tickets changes and invoke callback. */
export function useTicketsRealtime(onChange: () => void) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null =
      null
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
      channel = supabase
        .channel('tech-tickets')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets' },
          () => {
            if (!cancelled) onChange()
          },
        )
        .subscribe((status) => {
          if (!cancelled && status === 'SUBSCRIBED') setReady(true)
        })
    } catch {
      setReady(false)
    }
    return () => {
      cancelled = true
      if (supabase && channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [onChange])

  return ready
}
