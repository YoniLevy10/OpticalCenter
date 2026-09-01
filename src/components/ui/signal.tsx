import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import type { SlaTone, SlaView } from '@/modules/tickets/sla-display'
import { plainStatus, plainUrgency } from '@/components/ops/plain-labels'
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
    ? 'bg-[var(--signal-critical-soft)]/25'
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
  const label = plainUrgency(priority)
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

/* ------------------------------------------------------------------ */
/* Status — typography, with a marker only for states needing action   */
/* ------------------------------------------------------------------ */

type StatusTreatment = {
  className: string
  marker: string | null
}

function statusTreatment(status: string): StatusTreatment {
  switch (status) {
    case 'new':
      return {
        className: 'text-[var(--signal-critical)]',
        marker: 'bg-[var(--signal-critical)]',
      }
    case 'waiting_parts':
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

export function StatusLabel({
  status,
  className,
}: {
  status: TicketStatus | string
  className?: string
}) {
  const label = plainStatus(status)
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

function statusChipClass(status: string): string {
  switch (status) {
    case 'new':
    case 'waiting_parts':
      return 'bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]'
    case 'assigned':
    case 'triaged':
    case 'in_progress':
      return 'bg-[var(--signal-warning-soft)] text-[var(--signal-warning)]'
    case 'resolved':
    case 'closed':
      return 'bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]'
    case 'cancelled':
      return 'bg-surface-sunken text-ink-3'
    default:
      return 'bg-surface-sunken text-ink-2'
  }
}

/** Quiet pill for list rows — Operational Quiet inventory style. */
export function StatusChip({
  status,
  className,
}: {
  status: TicketStatus | string
  className?: string
}) {
  return (
    <span
      className={cn('ops-status-chip', statusChipClass(status), className)}
    >
      {plainStatus(status)}
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
    <div className="live-sla flex flex-col gap-0.5" data-live="sla">
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
