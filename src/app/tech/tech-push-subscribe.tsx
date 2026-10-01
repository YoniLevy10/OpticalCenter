'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Web Push subscribe for technicians when VAPID public key is configured.
 */
export function TechPushSubscribe() {
  const [vapid, setVapid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/push/subscribe')
        const json = await res.json()
        const key =
          json.vapidPublicKey ||
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          null
        setVapid(typeof key === 'string' && key.length > 20 ? key : null)
      } catch {
        setVapid(null)
      }
    })()
  }, [])

  if (!vapid) {
    return (
      <p className="t-caption mb-3 text-ink-3">
        התראות Push יופעלו כשיוגדרו מפתחות VAPID. בינתיים: SMS + WhatsApp.
      </p>
    )
  }

  async function subscribe() {
    setBusy(true)
    setStatus(null)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('הדפדפן לא תומך ב־Push')
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid!),
      })
      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'הרשמה נכשלה')
      setStatus('התראות Push הופעלו')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'הרשמה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3 space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="touch"
        className="md:h-9 md:min-h-0"
        disabled={busy}
        onClick={() => void subscribe()}
      >
        {busy ? 'מפעיל…' : 'הפעלת התראות Push'}
      </Button>
      {status ? <p className="t-caption text-ink-2">{status}</p> : null}
    </div>
  )
}
