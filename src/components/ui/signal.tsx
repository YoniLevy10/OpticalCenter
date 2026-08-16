import {
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import type { SlaTone, SlaView } from '@/modules/tickets/sla-display'
import { cn } from '@/lib/utils'

/**
 * THE SIGNAL RULE (docs/DESIGN_SYSTEM.md §4)
 *
 *   Priority → leading edge     (position)
 *   Status   → typography       (text)
 *   SLA      → live tabular num (number)
 *
 * Three orthogonal dimensions must never share a visual shape, or the operator
 * cannot scan a single dimension vertically. None of these use tenant colour.
 */

/* ------------------------------------------------------------------ */
/* Priority — position-encoded leading edge                            */
/* ------------------------------------------------------------------ */

export function priorityEdgeClass(priority: string | null | undefined): string {
  if (priority === 'critical') return 'edge edge-critical'
  if (priority === 'high') return 'edge edge-high'
  if (priority === 'medium') return 'edge edge-medium'
  return 'edge'
}

/** Critical rows get a faint tint so a breach-heavy queue reads at a glance. */
export function priorityRowClass(priority: string | null | undefined): string {
  return priority === 'critical'
    ? 'bg-[var(--signal-critical-soft)]/45'
    : ''
}

/** Text form of priority, for detail surfaces where there is no row edge. */
export function PriorityText({
  priority,
  className,
}: {
  priority: TicketPriority | string
  className?: string
}) {
  const label = TICKET_PRIORITY_LABELS_HE[priority as TicketPriority] ?? priority
  const strong = priority === 'critical'
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

/* ------------------------------------------------------------------ */
/* Status — typography, with a marker only for states needing action   */
/* ------------------------------------------------------------------ */

type StatusTreatment = {
  className: string
  marker: string | null
}

function statusTreatment(status: string): StatusTreatment {
  switch (status) {
    case 'waiting_parts':
      // Blocked. Someone must act. This one earns colour.
      return {
        className: 'text-[var(--signal-warning)]',
        marker: 'bg-[var(--signal-warning)]',
      }
    case 'resolved':
      return {
        className: 'text-[var(--signal-resolved)]',
        marker: 'bg-[var(--signal-resolved)]',
      }
    case 'closed':
    case 'cancelled':
      return { className: 'text-ink-3', marker: null }
    case 'in_progress':
      return { className: 'text-ink', marker: null }
    default:
      return { className: 'text-ink-2', marker: null }
  }
}

export function StatusLabel({
  status,
  className,
}: {
  status: TicketStatus | string
  className?: string
}) {
  const label = TICKET_STATUS_LABELS_HE[status as TicketStatus] ?? status
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

/* ------------------------------------------------------------------ */
/* SLA — the only live number in the row                               */
/* ------------------------------------------------------------------ */

const slaToneClass: Record<SlaTone, string> = {
  idle: 'text-ink-3',
  neutral: 'text-ink-2',
  warning: 'text-[var(--signal-warning)]',
  critical: 'text-[var(--signal-critical)] font-medium',
  done: 'text-ink-3',
}

export function SlaValue({
  view,
  className,
}: {
  view: SlaView
  className?: string
}) {
  return (
    <span
      className={cn('t-body t-num', slaToneClass[view.tone], className)}
      title={view.long}
    >
      {view.short}
    </span>
  )
}

/** Detail-surface form: the value plus what deadline it refers to. */
export function SlaBlock({ view }: { view: SlaView }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('t-lead t-num', slaToneClass[view.tone])}>
        {view.short}
      </span>
      <span className="t-caption text-ink-3">{view.long}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Source — quiet metadata, never a badge                              */
/* ------------------------------------------------------------------ */

export function MetaValue({
  children,
  ltr,
  className,
}: {
  children: React.ReactNode
  ltr?: boolean
  className?: string
}) {
  return (
    <span
      dir={ltr ? 'ltr' : undefined}
      className={cn('t-meta text-ink-2', ltr && 't-num inline-block', className)}
    >
      {children}
    </span>
  )
}
