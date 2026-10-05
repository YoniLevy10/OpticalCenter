import type { SlaTone, SlaView } from '@/modules/tickets/sla-display'
import { cn } from '@/lib/utils'

export { PriorityText, StatusLabel } from '@/components/ui/status-label'

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
    ? 'bg-[var(--signal-critical-soft)]/40'
    : ''
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
