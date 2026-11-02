import type { ReactNode } from 'react'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'
import type { QueueTicket } from '@/modules/tickets/queue'
import type { RecommendationCardModel } from '@/modules/recommendations/present'

export function TicketStoreGroups({
  rows,
  renderRow,
}: {
  rows: QueueTicket[]
  cards?: RecommendationCardModel[]
  renderRow: (ticket: QueueTicket) => ReactNode
}) {
  const groups = new Map<string, QueueTicket[]>()
  for (const ticket of rows) {
    const key = ticket.store_id || ticket.stores?.code || 'none'
    const list = groups.get(key) ?? []
    list.push(ticket)
    groups.set(key, list)
  }

  return (
    <div className="store-stack p-2.5">
    <PhoneFoldStack>
      {[...groups.entries()].map(([key, tickets]) => {
        const sample = tickets[0]
        const name = sample?.stores?.name || sample?.stores?.code || 'בלי סניף'
        const code = sample?.stores?.code
        const countLabel = tickets.length === 1 ? 'פתוחה' : 'פתוחות'
        return (
          <PhoneFold
            key={key}
            title={name}
            summary={`${code && code !== name ? `${code} · ` : ''}${tickets.length} ${countLabel}`}
          >
          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface max-md:rounded-none max-md:border-0 max-md:bg-transparent">
            <header className="sticky top-0 z-10 hidden items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:flex">
              <div className="min-w-0">
                <h2 className="t-body-strong truncate text-ink">{name}</h2>
                {code && code !== name ? (
                  <p className="t-meta t-num text-ink-3">{code}</p>
                ) : null}
              </div>
              <span className="t-caption shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-ink-2">
                <span className="t-num">{tickets.length}</span>{' '}
                {countLabel}
              </span>
            </header>
            <div>
              {tickets.map((ticket) => (
                <div key={ticket.id}>{renderRow(ticket)}</div>
              ))}
            </div>
          </section>
          </PhoneFold>
        )
      })}
    </PhoneFoldStack>
    </div>
  )
}
