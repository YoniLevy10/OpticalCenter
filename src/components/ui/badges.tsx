import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import {
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { StatusDot } from '@/components/ui/primitives'

/** Quiet status: color only when attention is needed. */
function statusTone(
  status: string,
): 'neutral' | 'warning' | 'success' | 'info' | 'accent' {
  if (status === 'waiting_parts') return 'warning'
  if (status === 'resolved') return 'success'
  if (status === 'in_progress') return 'info'
  if (status === 'new' || status === 'triaged') return 'accent'
  return 'neutral'
}

export function StatusBadge({ status }: { status: TicketStatus | string }) {
  const label = TICKET_STATUS_LABELS_HE[status as TicketStatus] ?? status
  return <StatusDot tone={statusTone(status)} label={label} />
}

export function PriorityDot({ priority }: { priority: TicketPriority | string }) {
  const label = TICKET_PRIORITY_LABELS_HE[priority as TicketPriority] ?? priority
  const tone =
    priority === 'critical' || priority === 'high'
      ? 'danger'
      : priority === 'medium'
        ? 'warning'
        : 'neutral'
  return <StatusDot tone={tone} label={label} />
}

export function SlaChip({
  breached,
  label,
}: {
  breached?: boolean
  label: string
}) {
  return (
    <StatusDot tone={breached ? 'danger' : 'neutral'} label={label} />
  )
}
