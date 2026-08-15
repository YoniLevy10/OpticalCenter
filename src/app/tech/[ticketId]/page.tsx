import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TechShell, techHref } from '@/components/layout/tech-shell'
import { PriorityDot, StatusBadge, SlaChip } from '@/components/ui/badges'
import { Card } from '@/components/ui/primitives'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import { TICKET_STATUS_LABELS_HE } from '@/modules/tickets/constants'
import { fetchTechTicket, isUuid, resolveTechId } from '@/modules/tickets/tech'
import { formatSlaLabelHe, isSlaBreached } from '@/modules/tickets/sla'

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
          <p className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
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
  const breached = isSlaBreached({
    priority: ticket.priority,
    status: ticket.status,
  })

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
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status as TicketStatus} />
            <PriorityDot priority={ticket.priority as TicketPriority} />
            <SlaChip
              breached={breached}
              label={formatSlaLabelHe({
                priority: ticket.priority,
                status: ticket.status,
              })}
            />
          </div>
          {ticket.stores?.address ? (
            <p className="mt-2 text-[12px] text-muted">{ticket.stores.address}</p>
          ) : null}
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
            {ticket.description || ticket.title || 'ללא תיאור'}
          </p>
          <p className="mt-3 text-[12px] text-faint">
            קטגוריה: {ticket.category}
            {ticket.assigned_to
              ? ` · משויך: ${ticket.assigned_to.slice(0, 8)}…`
              : ' · לא משויך'}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-[14px] font-medium">פעולות</h2>
          <TechTicketActions
            ticketId={ticket.id}
            techId={techId}
            status={ticket.status}
            assignedTo={ticket.assigned_to}
          />
        </Card>

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <Card className="p-4">
            <h2 className="mb-3 text-[14px] font-medium">תמונות</h2>
            <ul className="space-y-2">
              {ticket.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-[13px] text-accent underline"
                    dir="ltr"
                  >
                    {a.url}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {ticket.events && ticket.events.length > 0 ? (
          <Card className="p-4">
            <h2 className="mb-3 text-[14px] font-medium">יומן אירועים</h2>
            <ol className="space-y-3">
              {ticket.events.map((ev) => (
                <li
                  key={ev.id}
                  className="border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-[11px] text-faint">
                    {new Date(ev.created_at).toLocaleString('he-IL')} · {ev.event_type}
                  </p>
                  {typeof ev.payload?.note === 'string' ? (
                    <p className="mt-1 text-[13px] text-foreground">{ev.payload.note}</p>
                  ) : null}
                  {typeof ev.payload?.to_status === 'string' ? (
                    <p className="mt-1 text-[13px] text-muted">
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
          </Card>
        ) : null}

        <p className="text-center text-[12px] text-faint">
          <Link href={techHref('/tech', techId)} className="text-accent hover:underline">
            חזרה לרשימת העבודות
          </Link>
        </p>
      </div>
    </TechShell>
  )
}
