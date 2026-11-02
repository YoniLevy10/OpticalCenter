'use client'

import { useEffect, useRef } from 'react'

/** Brings the opened approval card to the top, clear of the tab bar and the agent bubble. */
export function OpenCardScroll({ active }: { active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!active) return
    ref.current?.closest('article')?.scrollIntoView({ block: 'start' })
  }, [active])

  if (!active) return null
  return <span ref={ref} className="sr-only" />
}
