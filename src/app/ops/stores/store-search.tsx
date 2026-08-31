'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { SearchField } from '@/components/ui/input'

function hrefFor(q: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  const s = params.toString()
  return s ? `/ops/stores?${s}` : '/ops/stores'
}

export function StoreSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    if (q === initialQ) return
    const id = setTimeout(() => {
      startTransition(() => {
        router.replace(hrefFor(q), { scroll: false })
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
      placeholder="חיפוש חנות..."
      autoFocusKey="/"
      className="w-full"
    />
  )
}
