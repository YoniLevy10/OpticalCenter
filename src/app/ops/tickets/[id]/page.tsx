import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge, SlaChip } from '@/components/ui/badges'
import { Card } from '@/components/ui/primitives'
import {
  TICKET_EVENT_LABELS_HE,
  TICKET_SOURCE_LABELS_HE,
  type TicketPriority,
  type TicketSourceLabel,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { getById, listInternalTechnicians } from '@/modules/tickets/service'
import { formatSlaLabelHe, isSlaBreached } from '@/modules/tickets/sla'
import { TicketActions } from './ticket-actions'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm')
  } catch {
    return iso
  }
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let ticket
  try {
    ticket = await getById(id)
  } catch {
    ticket = null
  }
  if (!ticket) notFound()

  const technicians = await listInternalTechnicians().catch(() => [])
  const display =
    ticket.display_number ??
    (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
  const breached = isSlaBreached({
    priority: ticket.priority,
    sla_respond_by: ticket.sla_respond_by,
    sla_resolve_by: ticket.sla_resolve_by,
    status: ticket.status,
    resolved_at: ticket.resolved_at,
  })

  return (
    <OpsShell
      pathname="/ops/tickets"
      title={display}
      subtitle={ticket.title ?? ticket.category}
    >
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Link
          href="/ops/tickets"
          className="mb-4 inline-block text-[12px] text-muted hover:text-foreground"
        >
          → חזרה לתקלות
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={ticket.status as TicketStatus} />
                <PriorityDot priority={ticket.priority as TicketPriority} />
                <span className="text-[12px] text-muted">
                  {TICKET_SOURCE_LABELS_HE[ticket.source as TicketSourceLabel] ??
                    ticket.source}
                </span>
                <SlaChip
                  breached={breached}
                  label={formatSlaLabelHe({
                    priority: ticket.priority,
                    sla_respond_by: ticket.sla_respond_by,
                    sla_resolve_by: ticket.sla_resolve_by,
                    status: ticket.status,
                    resolved_at: ticket.resolved_at,
                  })}
                />
              </div>
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed">
                {ticket.description}
              </p>
            </Card>

            <Card>
              <div className="border-b border-border px-4 py-3 text-[14px] font-medium">
                שיחה / הודעות
              </div>
              <ul className="divide-y divide-border">
                {(ticket.messages ?? []).length === 0 ? (
                  <li className="px-4 py-8 text-center text-[13px] text-muted">
                    אין הודעות עדיין
                  </li>
                ) : (
                  (ticket.messages ?? []).map(
                    (m: {
                      id: string
                      direction: string
                      body: string | null
                      created_at: string
                    }) => (
                      <li key={m.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
                          <span>
                            {m.direction === 'inbound' ? 'נכנס' : 'יוצא'}
                          </span>
                          <span>{fmt(m.created_at)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13px]">
                          {m.body}
                        </p>
                      </li>
                    ),
                  )
                )}
              </ul>
            </Card>

            <Card>
              <div className="border-b border-border px-4 py-3 text-[14px] font-medium">
                אירועים
              </div>
              <ul className="divide-y divide-border">
                {(ticket.events ?? []).length === 0 ? (
                  <li className="px-4 py-8 text-center text-[13px] text-muted">
                    אין אירועים
                  </li>
                ) : (
                  (ticket.events ?? []).map(
                    (e: {
                      id: string
                      event_type: string
                      created_at: string
                      payload?: Record<string, unknown>
                    }) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
                      >
                        <span>
                          {TICKET_EVENT_LABELS_HE[e.event_type] ?? e.event_type}
                        </span>
                        <span className="text-[11px] text-faint">
                          {fmt(e.created_at)}
                        </span>
                      </li>
                    ),
                  )
                )}
              </ul>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-[14px] font-medium">פרטים</h2>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">חנות</dt>
                  <dd className="text-end font-medium">
                    {ticket.stores
                      ? `${ticket.stores.name} (#${ticket.stores.code})`
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">עיר</dt>
                  <dd>{ticket.stores?.city ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">קטגוריה</dt>
                  <dd>{ticket.category}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">נוצר</dt>
                  <dd>{fmt(ticket.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">מדווח</dt>
                  <dd className="text-end">
                    {ticket.reporter_name ?? '—'}
                    {ticket.reporter_phone ? (
                      <div className="text-[11px] text-faint">
                        {ticket.reporter_phone}
                      </div>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="hidden p-4 md:block">
              <h2 className="mb-3 text-[14px] font-medium">פעולות</h2>
              <TicketActions
                ticketId={ticket.id}
                status={ticket.status as TicketStatus}
                assignedTo={ticket.assigned_to}
                technicians={technicians}
              />
            </Card>
          </div>
        </div>

        <TicketActions
          ticketId={ticket.id}
          status={ticket.status as TicketStatus}
          assignedTo={ticket.assigned_to}
          technicians={technicians}
          stickyMobile
        />
      </div>
    </OpsShell>
  )
}
