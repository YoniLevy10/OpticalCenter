'use client'

import { usePhrase } from '@/components/i18n/locale-provider'
import { PhoneRow } from '@/components/layout/phone-fold'

type StoreRow = {
  id: string
  code: string
  name: string
  city: string | null
  address?: string | null
  is_active?: boolean
  openCount: number
  waHref?: string | null
}

export function StoresMobileList({
  stores,
}: {
  stores: StoreRow[]
  canEdit?: boolean
}) {
  const p = usePhrase()
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      {stores.map((s) => {
        const inactive = s.is_active === false
        const open =
          s.openCount > 0
            ? `${s.openCount} ${s.openCount === 1 ? p('פתוחה') : p('פתוחות')}`
            : p('שקט')
        return (
          <PhoneRow
            key={s.id}
            href={`/ops/stores/${encodeURIComponent(s.code)}`}
            title={s.name}
            summary={`${s.code} · ${open}${inactive ? ` · ${p('חנות מושבתת')}` : ''}`}
          />
        )
      })}
    </div>
  )
}
