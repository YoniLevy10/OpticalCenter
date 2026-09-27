'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { SearchField } from '@/components/ui/input'
import { queueHref, parseQueueParams } from '@/modules/tickets/queue'

export function TicketSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    if (q === initialQ) return
    const id = setTimeout(() => {
      const sp = Object.fromEntries(searchParams.entries())
      const filters = parseQueueParams(sp)
      startTransition(() => {
        router.replace(queueHref(filters, { q: q.trim() || undefined }), {
          scroll: false,
        })
      })
    }, 220)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  return (
    <SearchField
      value={q}
      onValueChange={setQ}
      placeholder="חיפוש תקלה, חנות, מספר…"
      autoFocusKey="/"
      className="w-full"
    />
  )
}
