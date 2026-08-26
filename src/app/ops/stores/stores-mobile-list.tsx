'use client'

import Link from 'next/link'
import { WhatsAppShareButton } from '@/components/ui/whatsapp-share-button'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

type StoreRow = {
  id: string
  code: string
  name: string
  city: string | null
  is_active?: boolean
  openCount: number
}

export function StoresMobileList({ stores }: { stores: StoreRow[] }) {
  return (
    <div className="md:hidden divide-y divide-border">
      {stores.map((s) => (
        <div key={s.id}>
          <Link
            href={`/ops/stores/${encodeURIComponent(s.code)}`}
            className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 active:bg-canvas"
          >
            <span className="t-body-strong t-num w-10 shrink-0 text-ink">
              {s.code}
            </span>
            <span className="min-w-0 flex-1">
              <span className="t-body block truncate text-ink">{s.name}</span>
              <span className="t-meta block truncate text-ink-2">
                {s.city ?? '—'}
                {s.is_active === false ? ' · מושבת' : ''}
              </span>
            </span>
            {s.openCount > 0 ? (
              <span className="t-caption t-num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--signal-critical-soft)] px-1.5 text-[var(--signal-critical)]">
                {s.openCount}
              </span>
            ) : (
              <span className="t-caption shrink-0 text-ink-3">QR</span>
            )}
          </Link>
          <div className="flex justify-end px-4 pb-2">
            <WhatsAppShareButton
              prefillText={storeWhatsAppPrefill(s.code)}
              label="שיתוף WhatsApp"
              size="sm"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
