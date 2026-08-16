'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

/** Development affordance. Never rendered in primary navigation. */
export function SeedDemoTicketButton({
  assignToTech = true,
  size = 'sm',
}: {
  assignToTech?: boolean
  size?: 'sm' | 'block'
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function seed() {
    setError(null)
    try {
      const res = await fetch(
        `/api/demo/seed-ticket${assignToTech ? '?assign=1' : ''}`,
        { method: 'POST' },
      )
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        detailPath?: string
        ticket?: { display_number?: string | null }
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'יצירת הדגמה נכשלה')
        toast.push({ title: 'יצירת הדגמה נכשלה', tone: 'critical' })
        return
      }
      toast.push({
        title: `נוצרה ${data.ticket?.display_number ?? 'תקלה'}`,
        tone: 'success',
      })
      startTransition(() => {
        if (data.detailPath) router.push(data.detailPath)
        else router.refresh()
      })
    } catch {
      setError('שגיאת רשת')
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size={size}
        disabled={pending}
        onClick={() => void seed()}
      >
        {pending ? 'יוצר…' : 'תקלת הדגמה'}
      </Button>
      {error ? (
        <p className="t-caption mt-1 text-[var(--signal-critical)]">{error}</p>
      ) : null}
    </div>
  )
}
