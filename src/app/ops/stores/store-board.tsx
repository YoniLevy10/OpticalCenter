import Link from 'next/link'
import { cn } from '@/lib/utils'

export type StoreCardModel = {
  id: string
  code: string
  name: string
  city: string | null
  inactive: boolean
  openCount: number
  status: string
}

export type StoreGroupModel = {
  code: string
  label: string
  stores: StoreCardModel[]
}

function showCity(name: string, city: string | null): boolean {
  const place = city?.trim()
  if (!place) return false
  return !name.includes(place)
}

export function StoreBoard({ groups }: { groups: StoreGroupModel[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.code} aria-labelledby={`region-${group.code}`}>
          <header className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id={`region-${group.code}`} className="t-title text-ink">
                {group.label}
              </h2>
              <span aria-hidden className="clay-rule" />
            </div>
            <span className="t-meta t-num text-ink-3">{group.stores.length}</span>
          </header>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
            {group.stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/ops/stores/${encodeURIComponent(store.code)}`}
                  aria-label={`${store.name}, ${store.code}`}
                  className={cn(
                    'flex min-h-[7.5rem] flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-3.5 py-3.5',
                    store.inactive && 'opacity-60',
                    store.openCount > 0 && 'border-[var(--tenant-line)] bg-[var(--tenant-soft)]',
                  )}
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[1.05rem] font-semibold leading-snug text-ink">
                      {store.name}
                    </span>
                    {showCity(store.name, store.city) ? (
                      <span className="t-meta mt-0.5 block truncate text-ink-3">{store.city}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="t-num text-[0.95rem] font-semibold tracking-tight text-ink-2">
                      {store.code}
                    </span>
                    <span
                      className={cn(
                        't-caption max-w-[6.5rem] truncate rounded-full px-2 py-1',
                        store.openCount > 0
                          ? 'bg-surface text-[var(--tenant)]'
                          : 'bg-[var(--surface-sunken)] text-ink-3',
                      )}
                    >
                      {store.status}
                    </span>
                  </span>
                </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
