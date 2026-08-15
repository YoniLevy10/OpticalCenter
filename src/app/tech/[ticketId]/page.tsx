import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TechShell, techHref } from '@/components/layout/tech-shell'
import { PriorityDot, StatusBadge } from '@/components/ui/badges'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { TICKET_STATUS_LABELS_HE } from '@/modules/tickets/constants'
import { fetchTechTicket, isUuid, resolveTechId } from '@/modules/tickets/tech'

export const dynamic = 'force-dynamic'

export default async function TechTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>
  searchParams: Promise<{ techId?: string }>
}) {
  const { ticketId } = await params
  const sp = await searchParams
  const techId = resolveTechId(sp.techId ?? null)

  if (!isUuid(ticketId)) notFound()

  const { ticket, error } = await fetchTechTicket(ticketId)
  if (!ticket) {
    if (error) {
      return (
        <TechShell title="תקלה" techId={techId} backHref={techHref('/tech', techId)}>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        </TechShell>
      )
    }
    notFound()
  }

  const storeName = ticket.stores?.name ?? 'חנות'
  const displayNo =
    ticket.display_number ?? (ticket.number != null ? `OC-${ticket.number}` : null)

  return (
    <TechShell
      title={storeName}
      subtitle={[
        ticket.stores?.code ? `#${ticket.stores.code}` : null,
        ticket.stores?.city,
        displayNo,
      ]
        .filter(Boolean)
        .join(' · ')}
      techId={techId}
      backHref={techHref('/tech', techId)}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status as TicketStatus} />
            <PriorityDot priority={ticket.priority as TicketPriority} />
          </div>
          {ticket.stores?.address ? (
            <p className="mt-2 text-xs text-zinc-500">{ticket.stores.address}</p>
          ) : null}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {ticket.description || ticket.title || 'ללא תיאור'}
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            קטגוריה: {ticket.category}
            {ticket.assigned_to
              ? ` · משויך: ${ticket.assigned_to.slice(0, 8)}…`
              : ' · לא משויך'}
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">פעולות</h2>
          <TechTicketActions
            ticketId={ticket.id}
            techId={techId}
            status={ticket.status}
            assignedTo={ticket.assigned_to}
          />
        </section>

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">תמונות</h2>
            <ul className="space-y-2">
              {ticket.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm text-sky-700 underline"
                    dir="ltr"
                  >
                    {a.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ticket.events && ticket.events.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">יומן אירועים</h2>
            <ol className="space-y-3">
              {ticket.events.map((ev) => (
                <li
                  key={ev.id}
                  className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-xs text-zinc-400">
                    {new Date(ev.created_at).toLocaleString('he-IL')} · {ev.event_type}
                  </p>
                  {typeof ev.payload?.note === 'string' ? (
                    <p className="mt-1 text-sm text-zinc-700">{ev.payload.note}</p>
                  ) : null}
                  {typeof ev.payload?.to_status === 'string' ? (
                    <p className="mt-1 text-sm text-zinc-600">
                      {TICKET_STATUS_LABELS_HE[ev.payload.from_status as TicketStatus] ??
                        String(ev.payload.from_status)}{' '}
                      →{' '}
                      {TICKET_STATUS_LABELS_HE[ev.payload.to_status as TicketStatus] ??
                        String(ev.payload.to_status)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <p className="text-center text-xs text-zinc-400">
          <Link href={techHref('/tech', techId)} className="text-sky-700 hover:underline">
            חזרה לרשימת העבודות
          </Link>
        </p>
      </div>
    </TechShell>
  )
}
