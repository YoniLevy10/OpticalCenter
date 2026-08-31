import { ticketNextAction } from '@/modules/ux/human-copy'
import type { TicketStatus } from '@/modules/tickets/constants'
import { cn } from '@/lib/utils'

/**
 * Plain-language next step for ticket detail — answers "מה צריך לעשות?" in ~5s.
 */
export function TicketNextStep({
  status,
  assignedTo,
  slaRespondBy,
  slaResolveBy,
  firstResponseAt,
  resolvedAt,
  className,
}: {
  status: TicketStatus | string
  assignedTo: string | null
  slaRespondBy?: string | null
  slaResolveBy?: string | null
  firstResponseAt?: string | null
  resolvedAt?: string | null
  className?: string
}) {
  const hint = ticketNextAction({
    status,
    assigned_to: assignedTo,
    sla_respond_by: slaRespondBy,
    sla_resolve_by: slaResolveBy,
    first_response_at: firstResponseAt,
    resolved_at: resolvedAt,
  })

  return (
    <aside
      className={cn(
        'rounded-[var(--radius-lg)] border border-border/80 bg-surface-sunken/40 px-4 py-4',
        className,
      )}
      aria-label="הצעד הבא"
    >
      <p className="t-caption text-ink-3">{hint.title}</p>
      <p className="t-body mt-1 text-ink">{hint.body}</p>
      {hint.cta ? (
        <p className="t-meta mt-2 text-ink-2">
          מומלץ עכשיו: <span className="t-body-strong text-ink">{hint.cta}</span>
        </p>
      ) : null}
    </aside>
  )
}
