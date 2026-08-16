'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SearchField } from '@/components/ui/input'

export function StoreSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initial)

  useEffect(() => {
    if (q === initial) return
    const id = setTimeout(() => {
      router.replace(q ? `/ops/stores?q=${encodeURIComponent(q)}` : '/ops/stores', {
        scroll: false,
      })
    }, 220)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <SearchField
      value={q}
      onValueChange={setQ}
      placeholder="קוד · שם · עיר"
      autoFocusKey="/"
      className="w-full sm:w-72"
    />
  )
}
