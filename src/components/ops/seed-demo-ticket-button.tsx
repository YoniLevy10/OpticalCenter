'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function SeedDemoTicketButton({
  assignToTech = true,
  className,
}: {
  assignToTech?: boolean
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function seed() {
    setError(null)
    setOk(null)
    try {
      const res = await fetch(
        `/api/demo/seed-ticket${assignToTech ? '?assign=1' : ''}`,
        { method: 'POST' },
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        detailPath?: string
        techPath?: string
        ticket?: { display_number?: string | null }
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'יצירת הדגמה נכשלה')
        return
      }
      setOk(data.ticket?.display_number ?? 'נוצרה תקלת הדגמה')
      startTransition(() => {
        if (data.techPath) router.push(data.techPath)
        else if (data.detailPath) router.push(data.detailPath)
        else router.refresh()
      })
    } catch {
      setError('שגיאת רשת')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        onClick={() => void seed()}
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? 'יוצר…' : 'תקלת הדגמה לטכנאי'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {ok ? <p className="mt-1 text-xs text-emerald-700">{ok}</p> : null}
    </div>
  )
}
