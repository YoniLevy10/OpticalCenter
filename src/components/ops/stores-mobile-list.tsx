import type { StoreRow } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { Button } from '@/components/ui/button'

export function StoresMobileList({ stores }: { stores: StoreRow[] }) {
  if (stores.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-10 text-center t-body text-ink-2 md:hidden">
        אין חנויות.
      </div>
    )
  }

  return (
    <ul className="mb-4 space-y-0 md:hidden">
      {stores.map((store) => {
        const wa = storeWhatsAppDeepLink(store.code)
        return (
          <li key={store.id} className="border-b border-border py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="t-body-strong truncate text-ink">{store.name}</h2>
                <p className="t-meta mt-0.5 text-ink-3" dir="ltr">
                  #{store.code}
                </p>
              </div>
              <span className="t-caption text-[var(--signal-resolved)]">פעילה</span>
            </div>
            <p className="t-body mt-2 text-ink-2">
              {[store.city, store.address].filter(Boolean).join(' · ') || '—'}
            </p>
            <div className="mt-3">
              <Button asChild variant="primary" size="touch">
                <a href={wa} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
