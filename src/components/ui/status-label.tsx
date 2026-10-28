'use client'

import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { plainStatus, plainUrgency } from '@/components/ops/plain-labels'
import { useLocale } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

function statusTreatment(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]'
    case 'waiting_parts':
    case 'waiting_vendor':
    case 'awaiting_info':
    case 'assigned':
    case 'triaged':
    case 'in_progress':
      return 'bg-[var(--signal-warning-soft)] text-[var(--signal-warning)]'
    case 'resolved':
    case 'closed':
      return 'bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]'
    case 'cancelled':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
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
  const tone = statusTreatment(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium',
        tone,
        className,
      )}
    >
      {label}
    </span>
  )
}
