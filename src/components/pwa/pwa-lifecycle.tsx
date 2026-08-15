'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

/**
 * Install coaching (Android beforeinstallprompt + iOS Share hint)
 * and controlled service-worker update banner (no silent skipWaiting).
 */
export function PwaLifecycle() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [dismissedInstall, setDismissedInstall] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem('mos-install-dismissed') === '1') {
        setDismissedInstall(true)
      }
    } catch {
      /* ignore */
    }

    if (!isStandalone() && isIos()) {
      setShowIosHint(true)
    }

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    let reg: ServiceWorkerRegistration | undefined
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').then((r) => {
        reg = r
        if (r.waiting) setWaitingWorker(r.waiting)
        r.addEventListener('updatefound', () => {
          const installing = r.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(r.waiting)
            }
          })
        })
      })

      const onControllerChange = () => window.location.reload()
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

      return () => {
        window.removeEventListener('beforeinstallprompt', onBip)
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          onControllerChange,
        )
        void reg
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  function dismissInstall() {
    setDismissedInstall(true)
    setShowIosHint(false)
    setDeferred(null)
    try {
      sessionStorage.setItem('mos-install-dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismissInstall()
  }

  function applyUpdate() {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
  }

  const showInstall =
    !dismissedInstall && !isStandalone() && (Boolean(deferred) || showIosHint)

  return (
    <>
      {waitingWorker ? (
        <div
          className="fixed inset-x-0 z-[70] border-b border-border bg-surface px-4 py-2 shadow-sm"
          style={{ top: 'env(safe-area-inset-top)' }}
        >
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <p className="text-[13px] text-foreground">גרסה חדשה מוכנה</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setWaitingWorker(null)}>
                אחר כך
              </Button>
              <Button type="button" size="sm" variant="primary" onClick={applyUpdate}>
                עדכן
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showInstall ? (
        <div
          className="fixed inset-x-0 z-[65] border-t border-border bg-surface px-4 py-3 shadow-[var(--shadow-modal)]"
          style={{
            bottom:
              'calc(var(--mobile-bottom-nav-height, 0px) + env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto flex max-w-lg items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-foreground">התקנת MaintainOS</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {deferred
                  ? 'הוסיפו למסך הבית לגישה מהירה במצב אפליקציה.'
                  : 'ב־iPhone: שתפו ← הוסף למסך הבית.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {deferred ? (
                <Button type="button" size="sm" variant="primary" onClick={() => void install()}>
                  התקן
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={dismissInstall}>
                סגור
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
