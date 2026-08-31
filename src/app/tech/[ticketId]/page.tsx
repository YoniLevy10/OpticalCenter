import { notFound, redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { TechShell } from '@/components/layout/tech-shell'
import { RefreshButton } from '@/components/layout/refresh-button'
import { techHref } from '@/lib/tech-href'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import { Panel, PanelHeader, ErrorState } from '@/components/ui/primitives'
import { PriorityText, SlaBlock, StatusLabel } from '@/components/ui/signal'
import { EvidenceGrid } from '@/components/ui/evidence'
import { Timeline } from '@/components/ui/timeline'
import { Button } from '@/components/ui/button'
import { PhoneCallLink } from '@/components/ui/phone-call-link'
import {
  TICKET_CATEGORY_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { fetchTechTicket, isUuid } from '@/modules/tickets/tech'
import { getById } from '@/modules/tickets/service'
import { mergeEvidence } from '@/modules/tickets/attachments'
import { getSlaView } from '@/modules/tickets/sla-display'
import { buildActivityDesc } from '@/modules/tickets/activity'
import {
  getServerActor,
  resolveServerTechId,
} from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorFromProfileId } from '@/lib/auth/load-memberships'
import { actorIsTech, testAuthAllowed } from '@/lib/auth/types'
import { actorCanOpenTechTicket } from '@/lib/auth/ticket-scope'

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

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const techId = resolveServerTechId(actor, sp.techId ?? null)

  if (!isUuid(ticketId)) notFound()

  const { ticket, error } = await fetchTechTicket(ticketId)

  if (!ticket) {
    if (error) {
      return (
        <TechShell
          title="עבודה"
          backHref={techHref('/tech', techId)}
          enablePullToRefresh
          headerActions={<RefreshButton label="רענון עבודה" />}
        >
          <ErrorState
            title="לא ניתן לטעון את העבודה"
            description="בדקו חיבור לרשת ונסו שוב."
            action={<RefreshButton label="רענון" />}
          />
        </TechShell>
      )
    }
    notFound()
  }

  // Scope check: prefer session tech actor; in demo mid-switch load actor for resolved techId.
  let scopeActor = actor && actorIsTech(actor) ? actor : null
  if (!scopeActor && testAuthAllowed() && techId) {
    scopeActor = await actorFromProfileId(techId, 'test_bearer')
  } else if (!scopeActor && actor) {
    scopeActor = actor
  }

  if (scopeActor) {
    const full = (await getById(ticketId).catch(() => null)) ?? ticket
    if (!actorCanOpenTechTicket(scopeActor, full)) {
      notFound()
    }
  }

  const fullTicket = await getById(ticketId).catch(() => null)
  const reporterPhone =
    fullTicket && 'reporter_phone' in fullTicket
      ? (fullTicket.reporter_phone as string | null)
      : null

  const storeName = ticket.stores?.name ?? 'חנות'
  const displayNo =
    ticket.display_number ?? (ticket.number != null ? `OC-${ticket.number}` : null)

  const slaView = getSlaView({
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.created_at,
  })

  const activity = buildActivityDesc([], ticket.events ?? [])
  // WhatsApp photos may live only on ticket_messages.media_url — merge like HQ.
  const attachments = mergeEvidence(
    ticket.attachments ?? [],
    fullTicket?.messages ?? [],
  )

  const mapsQuery = [ticket.stores?.address, ticket.stores?.city, storeName]
    .filter(Boolean)
    .join(', ')

  return (
    <TechShell
      title={storeName}
      eyebrow={displayNo ?? 'עבודה'}
      backHref={techHref('/tech', techId)}
      enablePullToRefresh
      headerActions={<RefreshButton label="רענון עבודה" />}
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
            <div className="mt-3 flex flex-wrap gap-2">
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
              {reporterPhone ? (
                <PhoneCallLink
                  phone={reporterPhone}
                  className="h-11 flex-1 justify-center md:h-9"
                />
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
