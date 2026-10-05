'use client'

import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { plainStatus, plainUrgency } from '@/components/ops/plain-labels'
import { useLocale } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

function statusTreatment(status: string): { className: string; marker: string | null } {
  switch (status) {
    case 'new':
      return {
        className: 'text-[var(--signal-critical)]',
        marker: 'bg-[var(--signal-critical)]',
      }
    case 'waiting_parts':
    case 'waiting_vendor':
    case 'awaiting_info':
    case 'assigned':
    case 'triaged':
    case 'in_progress':
      return {
        className: 'text-[var(--signal-warning)]',
        marker: 'bg-[var(--signal-warning)]',
      }
    case 'resolved':
    case 'closed':
      return {
        className: 'text-[var(--signal-resolved)]',
        marker: 'bg-[var(--signal-resolved)]',
      }
    case 'cancelled':
      return { className: 'text-ink-3', marker: null }
    default:
      return { className: 'text-ink-2', marker: null }
  }
}

export function PriorityText({
  priority,
  className,
}: {
  priority: TicketPriority | string
  className?: string
}) {
  const { locale } = useLocale()
  const label = plainUrgency(priority, locale)
  const strong = priority === 'critical' || priority === 'high'
  return (
    <span
      className={cn(
        't-body-strong inline-flex items-center gap-1.5',
        strong ? 'text-[var(--signal-critical)]' : 'text-ink',
        className,
      )}
    >
      {priority === 'critical' || priority === 'high' ? (
        <span
          aria-hidden
          className={cn(
            'h-2.5 w-[3px] rounded-full',
            priority === 'critical'
              ? 'bg-[var(--signal-critical)]'
              : 'bg-[var(--signal-critical)]/45',
          )}
        />
      ) : null}
      {label}
    </span>
  )
}

export function StatusLabel({
  status,
  className,
}: {
  status: TicketStatus | string
  className?: string
}) {
  const { locale } = useLocale()
  const label = plainStatus(status, locale)
  const { className: tone, marker } = statusTreatment(status)
  return (
    <span className={cn('t-body inline-flex items-center gap-1.5', tone, className)}>
      {marker ? (
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', marker)} />
      ) : null}
      {label}
    </span>
  )
}
