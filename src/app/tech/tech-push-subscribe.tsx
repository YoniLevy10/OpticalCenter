'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/primitives'

/**
 * Web Push subscribe foundation for tech PWA.
 * Stores PushSubscription on the server; actual push send needs VAPID + worker.
 */
export function TechPushSubscribe() {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function subscribe() {
    setBusy(true)
    setStatus(null)
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setStatus('הדפדפן לא תומך בהתראות Push')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('ההרשאה להתראות נדחתה')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const cfg = await fetch('/api/push/subscribe').then((r) => r.json())
      const vapid = cfg.vapidPublicKey as string | null

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        if (!vapid) {
          // Foundation without VAPID: store a placeholder endpoint so HQ can see intent.
          const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: `https://push.maintainos.local/demo/${crypto.randomUUID()}`,
              keys: { p256dh: 'demo', auth: 'demo' },
            }),
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || 'שמירה נכשלה')
          setStatus('נרשמתם להתראות (מצב דמו ללא VAPID)')
          return
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        })
      }

      const jsonSub = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: jsonSub.endpoint,
          keys: {
            p256dh: jsonSub.keys?.p256dh,
            auth: jsonSub.keys?.auth,
          },
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'שמירה נכשלה')
      setStatus('התראות Push הופעלו')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'שגיאה בהפעלת התראות')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3 space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => void subscribe()}
      >
        הפעלת התראות Push
      </Button>
      {status ? <Notice tone="neutral">{status}</Notice> : null}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
