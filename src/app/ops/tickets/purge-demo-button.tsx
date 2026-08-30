'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

export function PurgeDemoButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  function onPurge() {
    if (
      !window.confirm(
        'למחוק את כל תקלות הדמו (source=demo) לצמיתות? פעולה זו אינה ניתנת לביטול.',
      )
    ) {
      return
    }
    setError(null)
    setDone(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/tickets/purge-demo', { method: 'POST' })
        const json = (await res.json()) as {
          ok?: boolean
          deleted?: number
          error?: string
        }
        if (!res.ok || !json.ok) {
          setError(json.error || 'מחיקה נכשלה')
          return
        }
        setDone(json.deleted ?? 0)
        router.refresh()
      } catch {
        setError('מחיקה נכשלה')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={onPurge}
      >
        {pending ? 'מוחק…' : 'ניקוי תקלות דמו'}
      </Button>
      {done != null ? (
        <span className="t-meta text-ink-3">נמחקו {done}</span>
      ) : null}
      {error ? <span className="t-meta text-danger">{error}</span> : null}
    </div>
  )
}
