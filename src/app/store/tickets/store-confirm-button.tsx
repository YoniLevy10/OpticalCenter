'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/primitives'

export function StoreConfirmButton({
  ticketId,
  initialStatus,
  qualityHoldUntil,
}: {
  ticketId: string
  initialStatus: string
  qualityHoldUntil?: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(initialStatus === 'closed')
  const [holdPending, setHoldPending] = useState(false)
  const [holdUntil, setHoldUntil] = useState(qualityHoldUntil ?? null)

  if (status !== 'resolved' && !done && !holdPending) return null

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        status?: string
        pending_final_close?: boolean
        quality_hold_until?: string | null
      }
      if (!res.ok) throw new Error(json.error || 'אישור נכשל')
      if (json.pending_final_close) {
        setHoldPending(true)
        setHoldUntil(json.quality_hold_until ?? holdUntil)
        setStatus('resolved')
      } else {
        setStatus('closed')
        setDone(true)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setBusy(false)
    }
  }

  if (done || status === 'closed') {
    return (
      <Notice tone="success">תודה — האישור נקלט והתקלה נסגרה.</Notice>
    )
  }

  if (holdPending) {
    const dateLabel = holdUntil
      ? new Date(holdUntil).toLocaleDateString('he-IL', {
          day: 'numeric',
          month: 'short',
        })
      : '30 יום'
    return (
      <Notice tone="progress">
        תודה — האישור נקלט. התקלה בהחזקת איכות עד {dateLabel}; סגירה סופית
        אחרי תקופת המעקב.
      </Notice>
    )
  }

  return (
    <div className="space-y-3">
      <Notice tone="progress">
        גיבוי באתר: אשרו שהבעיה נפתרה. עדיף לאשר בוואטסאפ (כפתור או «מאשר»).
      </Notice>
      {error ? <Notice tone="critical">{error}</Notice> : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void confirm()
        }}
      >
        <Button type="submit" variant="primary" size="block" disabled={busy}>
          {busy ? 'מאשר…' : 'אשר שהתקלה נפתרה'}
        </Button>
      </form>
    </div>
  )
}
