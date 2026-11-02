'use client'

import { MidragSearchAction } from '@/components/ops/midrag-search-action'
import { PhoneCallLink } from '@/components/ui/phone-call-link'

export type HandlePerson = {
  id: string
  full_name: string
  phone: string | null
  trade: string | null
}

/** Two ways to send someone: the saved book, or Midrag. */
export function WhoHandles({
  category,
  city,
  professionals,
}: {
  category: string
  city?: string | null
  professionals: HandlePerson[]
}) {
  return (
    <div className="grid gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-3">
      <div className="grid gap-2">
        <p className="t-body-strong text-ink">מהמאגר שלנו</p>
        {professionals.length === 0 ? (
          <p className="t-meta text-ink-2">אין עדיין אנשי מקצוע שמורים.</p>
        ) : (
          <ul className="divide-y divide-border">
            {professionals.slice(0, 5).map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="t-body block truncate text-ink">{person.full_name}</span>
                  {person.trade ? (
                    <span className="t-meta block truncate text-ink-3">{person.trade}</span>
                  ) : null}
                </span>
                {person.phone ? <PhoneCallLink phone={person.phone} label="חיוג" /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-2 border-t border-border pt-3">
        <p className="t-body-strong text-ink">מידרג</p>
        <MidragSearchAction category={category} city={city} compact />
      </div>
    </div>
  )
}
