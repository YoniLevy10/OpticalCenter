import type { StoreRow } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { Button } from '@/components/ui/button'

export function StoresMobileList({ stores }: { stores: StoreRow[] }) {
  if (stores.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-10 text-center text-[13px] text-muted md:hidden">
        אין חנויות.
      </div>
    )
  }

  return (
    <ul className="mb-4 space-y-2 md:hidden">
      {stores.map((store) => {
        const wa = storeWhatsAppDeepLink(store.code)
        return (
          <li key={store.id}>
            <article className="rounded-[var(--radius-lg)] border border-border bg-surface p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold text-foreground">
                    {store.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-[12px] text-muted" dir="ltr">
                    #{store.code}
                  </p>
                </div>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                  פעילה
                </span>
              </div>
              <p className="mt-2 text-[13px] text-muted">
                {[store.city, store.address].filter(Boolean).join(' · ') || '—'}
              </p>
              <div className="mt-3">
                <Button asChild variant="primary" size="lg">
                  <a href={wa} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
