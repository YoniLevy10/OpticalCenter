'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Soft poll so the ops dashboard stays current without realtime. */
export function DashboardSoftRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, router])

  return null
}
