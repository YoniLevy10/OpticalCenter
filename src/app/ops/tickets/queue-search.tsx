'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { SearchField } from '@/components/ui/input'

function hrefFor(view: 'open' | 'resolved', q: string, store?: string) {
  const params = new URLSearchParams()
  params.set('view', view)
  if (q.trim()) params.set('q', q.trim())
  if (store) params.set('store', store)
  return `/ops/tickets?${params.toString()}`
}

/** Debounced ticket search — keeps URL shareable; avoids full reload spam on cellular. */
export function QueueSearch({
  view,
  initialQ,
  storeCode,
}: {
  view: 'open' | 'resolved'
  initialQ: string
  storeCode?: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    if (q === initialQ) return
    const id = setTimeout(() => {
      startTransition(() => {
        router.replace(hrefFor(view, q, storeCode), { scroll: false })
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
      placeholder="חיפוש מספר, חנות או תיאור…"
      autoFocusKey="/"
      className="w-full"
    />
  )
}
