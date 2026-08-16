import Link from 'next/link'
import { PriorityText, StatusLabel, SlaValue } from '@/components/ui/signal'
import { getSlaView } from '@/modules/tickets/sla-display'
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
        const sla = getSlaView({
          priority: t.priority,
          status: t.status,
          sla_respond_by: t.sla_respond_by,
          sla_resolve_by: t.sla_resolve_by,
          created_at: t.created_at,
        })
        return (
          <li key={t.id}>
            <Link
              href={`/ops/tickets/${t.id}`}
              className="block border-b border-border px-1 py-3 transition-colors active:bg-canvas"
            >
              <div className="flex items-start justify-between gap-2">
                <PriorityText priority={t.priority as TicketPriority} />
                <span className="t-meta t-num text-ink-2">
                  {t.display_number ??
                    (t.number != null ? `OC-${t.number}` : '—')}
                </span>
              </div>
              <p className="t-body-strong mt-1 text-ink">
                {t.stores?.name ?? '—'}
                {t.stores?.code ? (
                  <span className="t-meta text-ink-3"> #{t.stores.code}</span>
                ) : null}
              </p>
              <p className="t-body mt-1 line-clamp-2 text-ink-2">
                {t.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusLabel status={t.status as TicketStatus} />
                <span className="t-caption text-ink-3">{ageLabel(t.created_at)}</span>
                <SlaValue view={sla} />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
