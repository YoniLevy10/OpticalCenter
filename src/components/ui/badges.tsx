import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import {
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: TicketStatus | string }) {
  const label = TICKET_STATUS_LABELS_HE[status as TicketStatus] ?? status
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'new' && 'bg-sky-50 text-sky-700',
        status === 'assigned' && 'bg-violet-50 text-violet-700',
        status === 'in_progress' && 'bg-amber-50 text-amber-800',
        status === 'waiting_parts' && 'bg-orange-50 text-orange-800',
        status === 'resolved' && 'bg-emerald-50 text-emerald-700',
        status === 'closed' && 'bg-zinc-100 text-zinc-600',
        status === 'cancelled' && 'bg-zinc-100 text-zinc-500',
        status === 'triaged' && 'bg-indigo-50 text-indigo-700',
      )}
    >
      {label}
    </span>
  )
}

export function PriorityDot({ priority }: { priority: TicketPriority | string }) {
  const label = TICKET_PRIORITY_LABELS_HE[priority as TicketPriority] ?? priority
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          priority === 'critical' && 'bg-red-700',
          priority === 'high' && 'bg-red-500',
          priority === 'medium' && 'bg-amber-400',
          priority === 'low' && 'bg-emerald-500',
        )}
      />
      {label}
    </span>
  )
}
