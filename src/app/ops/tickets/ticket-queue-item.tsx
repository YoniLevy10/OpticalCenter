'use client'

import Link from 'next/link'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import type { TicketStatus } from '@/modules/tickets/constants'
import { Button } from '@/components/ui/button'
import { useLocale, usePhrase } from '@/components/i18n/locale-provider'
import { OperationalRow, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { cn } from '@/lib/utils'
import { plainOpenForHe } from '@/components/ops/plain-labels'
import { ticketDecision } from '@/modules/decisions/queue'
import { ticketIsUrgent } from '@/modules/tickets/urgent'
import type { QueueTicket } from '@/modules/tickets/queue'
import { useVisitSelection } from './visit-selection-context'

function displayNum(t: QueueTicket): string {
  if (t.display_number?.trim()) return t.display_number
  if (t.number != null) return `OC-${t.number}`
  return t.id.slice(0, 8)
}

export function TicketQueueItem({
  ticket,
  assigneeLabel,
  selectable = false,
}: {
  ticket: QueueTicket
  view: 'open' | 'resolved'
  assigneeLabel: string
  selectable?: boolean
  canOverrideResolve?: boolean
}) {
  const { locale } = useLocale()
  const p = usePhrase()
  const visitSelection = useVisitSelection()
  const open = OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)
  const openFor = plainOpenForHe(ticket.created_at, ticket, new Date(), locale)
  const selected = visitSelection?.selected.has(ticket.id) ?? false
  const decision = ticketDecision(ticket, new Date(), locale)
  const verb = decision?.action.split('·')[0]?.trim() || p('לטפל')

  if (!open) {
    return (
      <OperationalRow
        href={`/ops/tickets/${ticket.id}`}
        priority={ticket.priority}
        leading={
          <span className="inline-flex items-center gap-2">
            <span className="t-num text-ink">{displayNum(ticket)}</span>
            <span aria-hidden className="text-ink-3">
              ·
            </span>
            <span>{ticket.stores?.name?.trim() || p('חנות')}</span>
          </span>
        }
        title={ticket.title || ticket.description}
        footer={
          <>
            <StatusLabel status={ticket.status} />
            <Dot />
            <span className="t-meta truncate text-ink-2">{assigneeLabel}</span>
          </>
        }
      />
    )
  }

  return (
    <article
      className={cn(
        'border-b border-border bg-surface last:border-b-0',
        'transition-colors duration-[var(--dur-1)] hover:bg-surface-sunken/40',
        openFor.overdue && 'edge edge-overdue',
        selected && 'bg-[var(--tenant-soft)]/40',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2 md:items-start md:pt-3">
        {selectable && visitSelection ? (
          <label className="flex shrink-0 items-center self-center md:self-start md:pt-1">
            <input
              type="checkbox"
              className="h-6 w-6 accent-[var(--tenant)]"
              checked={selected}
              onChange={() => visitSelection.toggle(ticket.id)}
              aria-label={`בחירה לביקור ${displayNum(ticket)}`}
            />
          </label>
        ) : null}

        <Link
          href={`/ops/tickets/${ticket.id}`}
          className="min-w-0 flex-1 space-y-0.5 md:space-y-1.5"
        >
          <p className="t-body line-clamp-1 text-ink md:line-clamp-2">
            {ticket.title || ticket.description}
          </p>
          <p
            className={cn(
              't-meta truncate',
              openFor.overdue ? 'font-semibold text-[var(--tenant)]' : 'text-ink-3',
            )}
          >
            {openFor.text}
            <span className="text-ink-3"> · </span>
            <span className="text-ink-2">{verb}</span>
            <span className="text-ink md:hidden"> · {verb}</span>
          </p>
          <div className="hidden items-center gap-2 md:flex">
            <StatusLabel status={ticket.status} />
            {openFor.overdue ? (
              <span className="t-body-strong text-[var(--tenant)]">{p('דחוף')}</span>
            ) : null}
          </div>
        </Link>
      </div>
      <div className="flex justify-end px-4 pb-3 pt-2">
        {ticketIsUrgent(ticket) && ticket.status !== 'engaged' ? (
          <Button asChild variant="primary" size="sm" className="max-md:w-full">
            <Link href={`/ops/tickets/${ticket.id}`}>{verb}</Link>
          </Button>
        ) : (
          <Link href={`/ops/tickets/${ticket.id}`} className="t-meta text-ink">
            {verb}
          </Link>
        )}
      </div>
    </article>
  )
}
