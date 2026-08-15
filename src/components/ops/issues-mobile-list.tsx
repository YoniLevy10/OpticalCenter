import Link from 'next/link'
import { PriorityDot, StatusBadge, SlaChip } from '@/components/ui/badges'
import { formatSlaLabelHe, isSlaBreached } from '@/modules/tickets/sla'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

export type IssueRow = {
  id: string
  number: number | null
  display_number: string | null
  status: string
  priority: string
  description: string
  created_at: string
  stores?: { code: string; name: string; city: string | null } | null
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
}

function ageLabel(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: he })
  } catch {
    return '—'
  }
}

export function IssuesMobileList({ tickets }: { tickets: IssueRow[] }) {
  return (
    <ul className="space-y-2 md:hidden">
      {tickets.map((t) => {
        const breached = isSlaBreached({
          status: t.status,
          sla_respond_by: t.sla_respond_by,
          sla_resolve_by: t.sla_resolve_by,
        })
        return (
          <li key={t.id}>
            <Link
              href={`/ops/tickets/${t.id}`}
              className="block rounded-[var(--radius-lg)] border border-border bg-surface p-3 transition-colors active:bg-canvas"
            >
              <div className="flex items-start justify-between gap-2">
                <PriorityDot priority={t.priority as TicketPriority} />
                <span className="text-[13px] font-medium tabular-nums">
                  {t.display_number ??
                    (t.number != null ? `OC-${t.number}` : '—')}
                </span>
              </div>
              <p className="mt-1 text-[13px] font-medium">
                {t.stores?.name ?? '—'}
                {t.stores?.code ? (
                  <span className="text-muted"> #{t.stores.code}</span>
                ) : null}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                {t.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                <StatusBadge status={t.status as TicketStatus} />
                <span className="text-faint">{ageLabel(t.created_at)}</span>
              </div>
              <div className="mt-1">
                <SlaChip
                  breached={breached}
                  label={formatSlaLabelHe({
                    priority: t.priority,
                    status: t.status,
                    sla_respond_by: t.sla_respond_by,
                    sla_resolve_by: t.sla_resolve_by,
                  })}
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
