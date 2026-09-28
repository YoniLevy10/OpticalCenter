'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SESSION_KEY = 'maintainos-ops-session'
const HQ_HOME = '/ops/dashboard'

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const displayStandalone = window.matchMedia?.(
    '(display-mode: standalone)',
  ).matches
  // iOS Safari "Add to Home Screen" exposes navigator.standalone.
  const iosStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return Boolean(displayStandalone || iosStandalone)
}

/**
 * PWA / iOS often restore the last URL (historically /ops/tickets) instead of
 * manifest start_url. On the first HQ entry of a *standalone* session, if we
 * landed on the tickets queue root, bounce to the dashboard.
 *
 * Browser / Playwright tabs are unaffected — only installed PWA display mode.
 * In-app taps to תקלות later are unaffected (session flag already set).
 */
export function HqHomeLaunch() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const path = pathname.replace(/\/+$/, '') || '/'
      const seen = sessionStorage.getItem(SESSION_KEY)

      // Keep deep links to a specific ticket; only the queue root is the old home.
      if (path === '/ops/tickets' && !seen) {
        sessionStorage.setItem(SESSION_KEY, '1')
        if (isStandalonePwa()) {
          window.location.replace(HQ_HOME)
        }
        return
      }

      if (!seen) sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* private mode / blocked storage — ignore */
    }
  }, [pathname])

  return null
}
