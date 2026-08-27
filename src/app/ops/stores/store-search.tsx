'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { SearchField, Select, Field } from '@/components/ui/input'

function hrefFor(q: string, region: string, status: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (region) params.set('region', region)
  if (status) params.set('status', status)
  const s = params.toString()
  return s ? `/ops/stores?${s}` : '/ops/stores'
}

export function StoreSearch({
  initialQ,
  initialRegion,
  initialStatus,
  regions,
}: {
  initialQ: string
  initialRegion: string
  initialStatus: string
  regions: string[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    if (q === initialQ) return
    const id = setTimeout(() => {
      startTransition(() => {
        router.replace(hrefFor(q, initialRegion, initialStatus), {
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

  function setRegion(region: string) {
    router.replace(hrefFor(q, region, initialStatus), { scroll: false })
  }

  function setStatus(status: string) {
    router.replace(hrefFor(q, initialRegion, status), { scroll: false })
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <SearchField
        value={q}
        onValueChange={setQ}
        placeholder="חיפוש לפי שם · קוד · עיר"
        autoFocusKey="/"
        className="w-full sm:min-w-[18rem] sm:flex-1"
      />
      <Field label="אזור" htmlFor="store-region">
        <Select
          id="store-region"
          value={initialRegion}
          onChange={(e) => setRegion(e.target.value)}
          className="min-w-[9rem]"
        >
          <option value="">כל האזורים</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="סטטוס" htmlFor="store-status">
        <Select
          id="store-status"
          value={initialStatus}
          onChange={(e) => setStatus(e.target.value)}
          className="min-w-[8rem]"
        >
          <option value="">הכל</option>
          <option value="active">פעיל</option>
          <option value="inactive">מושבת</option>
        </Select>
      </Field>
    </div>
  )
}
