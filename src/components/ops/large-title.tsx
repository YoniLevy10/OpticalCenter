'use client'

import { useEffect } from 'react'

const THRESHOLD = 56

/**
 * Drives --large-title-progress (0→1) from #main-content scroll so the
 * mobile glass top bar title fades in as OpsPageHero collapses.
 */
export function LargeTitleScrollSync() {
  useEffect(() => {
    const root = document.documentElement
    const main = document.getElementById('main-content')
    if (!main) return

    let raf = 0
    const update = () => {
      raf = 0
      const y = main.scrollTop
      const p = Math.min(1, Math.max(0, y / THRESHOLD))
      root.style.setProperty('--large-title-progress', p.toFixed(3))
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }

    update()
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      main.removeEventListener('scroll', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
      root.style.setProperty('--large-title-progress', '0')
    }
  }, [])

  return null
}
