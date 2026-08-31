import { notFound, redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { TechShell } from '@/components/layout/tech-shell'
import { RefreshButton } from '@/components/layout/refresh-button'
import { techHref } from '@/lib/tech-href'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import { Panel, ErrorState } from '@/components/ui/primitives'
import { StatusLabel } from '@/components/ui/signal'
import { EvidenceGrid } from '@/components/ui/evidence'
import type { TicketStatus } from '@/modules/tickets/constants'
import { fetchTechTicket, isUuid } from '@/modules/tickets/tech'
import { getById } from '@/modules/tickets/service'
import { mergeEvidence } from '@/modules/tickets/attachments'
import {
  getServerActor,
  resolveServerTechId,
} from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorFromProfileId } from '@/lib/auth/load-memberships'
import { actorIsTech, testAuthAllowed } from '@/lib/auth/types'
import { actorCanOpenTechTicket } from '@/lib/auth/ticket-scope'
import { storeLabel } from '@/components/ops/plain-labels'

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
          headerActions={<RefreshButton label="רענון" />}
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
  const attachments = mergeEvidence(
    ticket.attachments ?? [],
    fullTicket?.messages ?? [],
  )
  const address = [ticket.stores?.address, ticket.stores?.city]
    .filter(Boolean)
    .join(', ')

  return (
    <TechShell
      title={storeLabel(ticket.stores)}
      backHref={techHref('/tech', techId)}
      enablePullToRefresh
      headerActions={<RefreshButton label="רענון" />}
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
        <Panel>
          <StatusLabel status={ticket.status as TicketStatus} />
          <p className="t-lead mt-4 whitespace-pre-wrap leading-relaxed text-ink">
            {ticket.description || ticket.title || 'ללא תיאור'}
          </p>
          {address ? (
            <p className="t-body mt-4 flex items-start gap-2 text-ink-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {address}
            </p>
          ) : null}
        </Panel>

        {attachments.length > 0 ? (
          <Panel>
            <p className="t-section mb-3 text-ink">תיעוד</p>
            <EvidenceGrid attachments={attachments} />
          </Panel>
        ) : null}
      </div>
    </TechShell>
  )
}
