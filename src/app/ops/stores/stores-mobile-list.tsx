'use client'

import Link from 'next/link'
import { usePhrase } from '@/components/i18n/locale-provider'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

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
    <PhoneFoldStack>
      {stores.map((s) => {
        const inactive = s.is_active === false
        const place = s.address?.trim() || s.city || '—'
        const open =
          s.openCount > 0
            ? `${s.openCount} ${s.openCount === 1 ? p('פתוחה') : p('פתוחות')}`
            : p('שקט')
        return (
          <PhoneFold
            key={s.id}
            title={s.name}
            summary={`${s.code} · ${open}${inactive ? ` · ${p('חנות מושבתת')}` : ''}`}
          >
            <p className="t-body text-ink-2">{place}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/ops/stores/${encodeURIComponent(s.code)}`} className="t-body-strong inline-flex min-h-12 items-center text-ink">
                {p('לסניף')}
              </Link>
              {s.waHref ? (
                <a href={s.waHref} className="t-body-strong inline-flex min-h-12 items-center text-ink">
                  WhatsApp
                </a>
              ) : null}
            </div>
          </PhoneFold>
        )
      })}
    </PhoneFoldStack>
  )
}
