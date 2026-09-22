'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/primitives'

export function StoreConfirmButton({
  ticketId,
  initialStatus,
}: {
  ticketId: string
  initialStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(initialStatus === 'closed')

  if (status !== 'resolved' && !done) return null

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'אישור נכשל')
      setStatus('closed')
      setDone(true)
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

  return (
    <div className="space-y-3">
      <Notice tone="progress">
        הטכנאי סיים טיפול. אשרו שהבעיה נפתרה — בלי לרדוף אחרי אף אחד.
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
