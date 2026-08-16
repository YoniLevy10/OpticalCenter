import { notFound } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { TechShell } from '@/components/layout/tech-shell'
import { techHref } from '@/lib/tech-href'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import { Panel, PanelHeader, ErrorState } from '@/components/ui/primitives'
import { PriorityText, SlaBlock, StatusLabel } from '@/components/ui/signal'
import { EvidenceGrid } from '@/components/ui/evidence'
import { Timeline } from '@/components/ui/timeline'
import { Button } from '@/components/ui/button'
import {
  TICKET_CATEGORY_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { fetchTechTicket, isUuid, resolveTechId } from '@/modules/tickets/tech'
import { getSlaView } from '@/modules/tickets/sla-display'
import { buildActivityDesc } from '@/modules/tickets/activity'

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
        <TechShell title="עבודה" backHref={techHref('/tech', techId)}>
          <ErrorState
            title="לא ניתן לטעון את העבודה"
            description="בדקו חיבור לרשת ונסו שוב."
          />
        </TechShell>
      )
    }
    notFound()
  }

  const storeName = ticket.stores?.name ?? 'חנות'
  const displayNo =
    ticket.display_number ?? (ticket.number != null ? `OC-${ticket.number}` : null)

  const slaView = getSlaView({
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.created_at,
  })

  const activity = buildActivityDesc([], ticket.events ?? [])
  const attachments = ticket.attachments ?? []

  const mapsQuery = [ticket.stores?.address, ticket.stores?.city, storeName]
    .filter(Boolean)
    .join(', ')

  return (
    <TechShell
      title={storeName}
      eyebrow={displayNo ?? 'עבודה'}
      backHref={techHref('/tech', techId)}
      subtitle={
        <span className="flex items-center gap-1.5">
          {ticket.stores?.code ? (
            <span className="t-num">#{ticket.stores.code}</span>
          ) : null}
          {ticket.stores?.city ? <span>· {ticket.stores.city}</span> : null}
        </span>
      }
      actions={
        <TechTicketActions
          ticketId={ticket.id}
          techId={techId}
          status={ticket.status}
          assignedTo={ticket.assigned_to}
        />
      }
    >
      <div className="space-y-4">
        {/* ---------- The three facts, above everything ---------- */}
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <PriorityText priority={ticket.priority as TicketPriority} />
              <StatusLabel status={ticket.status as TicketStatus} />
            </div>
            <SlaBlock view={slaView} />
          </div>

          <p className="t-lead mt-4 whitespace-pre-wrap leading-relaxed text-ink">
            {ticket.description || ticket.title || 'ללא תיאור'}
          </p>

          <p className="t-meta mt-3 text-ink-3">
            {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
          </p>
        </Panel>

        {/* ---------- Getting there ---------- */}
        {ticket.stores?.address || mapsQuery ? (
          <Panel>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="t-body text-ink">
                  {ticket.stores?.address ?? storeName}
                </p>
                {ticket.stores?.city ? (
                  <p className="t-meta text-ink-2">{ticket.stores.city}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button asChild variant="secondary" size="touch" className="flex-1">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  ניווט
                </a>
              </Button>
              {ticket.stores?.code ? (
                <Button asChild variant="secondary" size="touch" className="flex-1">
                  <a href={`tel:`} aria-disabled>
                    <Phone className="h-4 w-4" aria-hidden />
                    החנות
                  </a>
                </Button>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {attachments.length > 0 ? (
          <Panel flush>
            <PanelHeader title="תיעוד" meta={`${attachments.length}`} />
            <div className="p-4">
              <EvidenceGrid attachments={attachments} />
            </div>
          </Panel>
        ) : null}

        {activity.length > 0 ? (
          <Panel flush>
            <PanelHeader title="יומן" />
            <Timeline items={activity} />
          </Panel>
        ) : null}
      </div>
    </TechShell>
  )
}
