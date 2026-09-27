'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Soft poll so the ops dashboard stays current without realtime.
 *  3 min — balances freshness vs cellular data on an open HQ tab. */
export function DashboardSoftRefresh({ intervalMs = 180_000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, router])

  return null
}
