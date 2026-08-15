import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import {
  TICKET_EVENT_LABELS_HE,
  TICKET_SOURCE_LABELS_HE,
  type TicketPriority,
  type TicketSourceLabel,
  type TicketStatus,
} from '@/modules/tickets/constants'
import {
  getById,
  listInternalTechnicians,
} from '@/modules/tickets/service'
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

  return (
    <OpsShell title={display} subtitle={ticket.title ?? ticket.category}>
      <div className="mb-4">
        <Link
          href="/ops/tickets"
          className="text-xs text-zinc-500 hover:text-zinc-800"
        >
          ← חזרה לרשימה
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={ticket.status as TicketStatus} />
              <PriorityDot priority={ticket.priority as TicketPriority} />
              <span className="text-xs text-zinc-500">
                {TICKET_SOURCE_LABELS_HE[ticket.source as TicketSourceLabel] ??
                  ticket.source}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {ticket.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">חנות</dt>
                <dd className="font-medium">
                  {ticket.stores
                    ? `${ticket.stores.name} (#${ticket.stores.code})`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">עיר</dt>
                <dd>{ticket.stores?.city ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">קטגוריה</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">מדווח</dt>
                <dd>
                  {ticket.reporter_name ?? '—'}
                  {ticket.reporter_phone ? (
                    <span className="block text-zinc-500" dir="ltr">
                      {ticket.reporter_phone}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">SLA תגובה</dt>
                <dd className="tabular-nums">{fmt(ticket.sla_respond_by)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">SLA סיום</dt>
                <dd className="tabular-nums">{fmt(ticket.sla_resolve_by)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">נוצר</dt>
                <dd className="tabular-nums">{fmt(ticket.created_at)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">טכנאי</dt>
                <dd>
                  {ticket.assignee?.full_name ||
                    ticket.assignee?.email ||
                    ticket.assigned_to ||
                    '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-medium">הודעות</h2>
            </div>
            {ticket.messages.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">
                אין הודעות עדיין. שיחות WhatsApp יופיעו כאן.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {ticket.messages.map((m) => (
                  <li key={m.id} className="px-4 py-3 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                      <span>
                        {m.direction === 'inbound'
                          ? 'נכנסת'
                          : m.direction === 'outbound'
                            ? 'יוצאת'
                            : 'מערכת'}
                        {' · '}
                        {m.channel}
                      </span>
                      <span className="tabular-nums">{fmt(m.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-zinc-800">
                      {m.body || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-medium">אירועים</h2>
            </div>
            {ticket.events.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">אין אירועים.</p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {ticket.events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div>
                      <div className="font-medium text-zinc-800">
                        {TICKET_EVENT_LABELS_HE[e.event_type] ?? e.event_type}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500" dir="ltr">
                        {JSON.stringify(e.payload)}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                      {fmt(e.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium">פעולות</h2>
          <TicketActions
            ticketId={ticket.id}
            status={ticket.status as TicketStatus}
            assignedTo={ticket.assigned_to}
            technicians={technicians}
          />
        </aside>
      </div>
    </OpsShell>
  )
}
