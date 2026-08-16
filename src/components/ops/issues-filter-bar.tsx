'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

const SEGMENTS = [
  { key: 'open', label: 'פתוחות' },
  { key: 'new', label: 'חדש' },
  { key: 'critical', label: 'קריטי' },
  { key: 'assigned', label: 'משויך' },
  { key: 'in_progress', label: 'בטיפול' },
  { key: 'waiting_parts', label: 'ממתין' },
  { key: 'resolved', label: 'נפתר' },
] as const

export function IssuesFilterBar({
  statusFilter,
  q,
}: {
  statusFilter: string
  q?: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)

  function go(status: string) {
    const params = new URLSearchParams(qs)
    params.set('status', status)
    setOpen(false)
    router.push(`/ops/tickets?${params.toString()}`)
  }

  return (
    <>
      <div className="mb-3 hidden flex-wrap items-center gap-2 md:flex">
        {SEGMENTS.map((s) => {
          const params = new URLSearchParams(qs)
          params.set('status', s.key)
          const active = statusFilter === s.key
          return (
            <Link
              key={s.key}
              href={`/ops/tickets?${params.toString()}`}
              className={cn(
                't-control inline-flex h-8 items-center rounded-[var(--radius-md)] border px-3 transition-colors',
                active
                  ? 'border-[var(--tenant-line)] bg-[var(--tenant-soft)] text-[var(--tenant)]'
                  : 'border-border bg-surface text-ink-2 hover:text-ink',
              )}
            >
              {s.label}
            </Link>
          )
        })}
      </div>

      <div className="mb-3 flex items-center gap-2 md:hidden">
        <Button
          type="button"
          size="md"
          className="flex-1 justify-start"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          סינון · {SEGMENTS.find((s) => s.key === statusFilter)?.label ?? statusFilter}
        </Button>
      </div>

      <BottomSheet open={open} onOpenChange={setOpen} title="סינון תקלות">
        <div className="grid gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => go(s.key)}
              className={
                statusFilter === s.key
                  ? 'min-h-11 rounded-[var(--radius-md)] bg-[var(--tenant-soft)] px-3 text-start text-[14px] text-[var(--tenant)]'
                  : 'min-h-11 rounded-[var(--radius-md)] px-3 text-start text-[14px] text-ink hover:bg-canvas'
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
