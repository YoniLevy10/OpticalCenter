'use client'

import Link from 'next/link'
import { StoreRowActions } from './store-row-actions'
import { cn } from '@/lib/utils'

type StoreRow = {
  id: string
  code: string
  name: string
  city: string | null
  address?: string | null
  is_active?: boolean
  openCount: number
}

export function StoresMobileList({
  stores,
  canEdit,
}: {
  stores: StoreRow[]
  canEdit?: boolean
}) {
  return (
    <div className="md:hidden divide-y divide-border">
      {stores.map((s) => {
        const inactive = s.is_active === false
        return (
          <div key={s.id} className="px-4 py-3">
            <Link
              href={`/ops/stores/${encodeURIComponent(s.code)}`}
              className="flex min-h-[var(--tap)] items-start gap-3 active:bg-canvas"
            >
              <span className="t-body-strong t-num w-10 shrink-0 pt-0.5 text-ink">
                {s.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-body-strong block truncate text-ink">
                  {s.name}
                </span>
                <span className="t-meta mt-0.5 block truncate text-ink-2">
                  {s.address?.trim() || s.city || '—'}
                  {inactive ? ' · מושבת' : ''}
                </span>
              </span>
              <span
                className={cn(
                  't-caption t-num shrink-0 pt-0.5',
                  s.openCount > 0
                    ? 'text-[var(--signal-critical)]'
                    : 'text-ink-3',
                )}
              >
                {s.openCount}
              </span>
            </Link>
            <div className="mt-2 flex justify-end">
              <StoreRowActions code={s.code} canEdit={canEdit} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
