import { notFound, redirect } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { TechShell } from '@/components/layout/tech-shell'
import { RefreshButton } from '@/components/layout/refresh-button'
import { techHref } from '@/lib/tech-href'
import { TechTicketActions } from '@/app/tech/[ticketId]/tech-ticket-actions'
import { Panel, ErrorState, EmptyState } from '@/components/ui/primitives'
import { StatusLabel } from '@/components/ui/signal'
import { EvidenceGrid } from '@/components/ui/evidence'
import type { TicketStatus } from '@/modules/tickets/constants'
import { fetchTechTicket, isTicketRef } from '@/modules/tickets/tech'
import { getById } from '@/modules/tickets/service'
import { fetchTicketAttachments, mergeEvidence } from '@/modules/tickets/attachments'
import {
  getServerActor,
  resolveServerTechId,
} from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorFromProfileId } from '@/lib/auth/load-memberships'
import { actorIsTech, testAuthAllowed } from '@/lib/auth/types'
import {
  actorCanAccessTicket,
  actorCanOpenTechTicket,
} from '@/lib/auth/ticket-scope'
import { storeLabel } from '@/components/ops/plain-labels'
import { TECH_COMPLETION } from '@/modules/tech/completion-copy'

export const dynamic = 'force-dynamic'

function treatmentFromEvents(
  events: { event_type: string; payload: unknown }[] | undefined,
): string | null {
  if (!events?.length) return null
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]
    if (e.event_type !== 'tech_note') continue
    const payload = (e.payload ?? {}) as {
      resolution_note?: string
      note?: string
      to_status?: string
    }
    const text = (payload.resolution_note ?? payload.note)?.trim()
    if (text && (payload.to_status === 'resolved' || payload.resolution_note)) {
      return text
    }
  }
  return null
}

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

  if (!isTicketRef(ticketId)) notFound()

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

  const full = (await getById(ticketId).catch(() => null)) ?? ticket
  let techScope = actor && actorIsTech(actor) ? actor : null
  if (!techScope && techId && (testAuthAllowed() || shouldAllowDemoEntry())) {
    techScope = await actorFromProfileId(techId, 'test_bearer')
  }
  const openedByTech = techScope
    ? actorCanOpenTechTicket(techScope, full)
    : false
  const openedByHq = actor ? actorCanAccessTicket(actor, full) : false
  if (!openedByTech && !openedByHq && !(!actor && shouldAllowDemoEntry())) {
    return (
      <TechShell
        title="עבודה"
        backHref={techHref('/tech', techId)}
        enablePullToRefresh
        headerActions={<RefreshButton label="רענון" />}
      >
        <ErrorState
          title="אין הרשאה לעבודה זו"
          description="העבודה משויכת לטכנאי אחר, או שאין לכם גישה."
          action={<RefreshButton label="רענון" />}
        />
      </TechShell>
    )
  }

  const fullTicket = await getById(ticketId).catch(() => null)
  const storedAttachments = await fetchTicketAttachments(ticketId).catch(() => [])
  const attachments = mergeEvidence(
    [...(ticket.attachments ?? []), ...storedAttachments],
    fullTicket?.messages ?? [],
  )
  const address = [ticket.stores?.address, ticket.stores?.city]
    .filter(Boolean)
    .join(', ')
  const treatment = treatmentFromEvents(fullTicket?.events)
  const num =
    ticket.display_number ||
    (ticket.number != null ? `OC-${ticket.number}` : null)

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
        <Panel elevated>
          <div className="flex flex-wrap items-center gap-2">
            <StatusLabel status={ticket.status as TicketStatus} />
            {num ? (
              <span className="t-num t-caption text-ink-3" data-live="ticket-no">
                {num}
              </span>
            ) : null}
          </div>
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

        {treatment ? (
          <Panel elevated>
            <p className="t-section mb-2 text-ink">
              {TECH_COMPLETION.treatmentLabel}
            </p>
            <p className="t-body whitespace-pre-wrap text-ink-2">{treatment}</p>
          </Panel>
        ) : null}

        {attachments.length > 0 ? (
          <Panel elevated>
            <p className="t-section mb-3 text-ink">תיעוד</p>
            <EvidenceGrid attachments={attachments} />
          </Panel>
        ) : ticket.status === 'in_progress' ? (
          <Panel elevated>
            <EmptyState
              title="עדיין אין הוכחת ביצוע"
              description="בסיום — צרפו תמונה או וידאו יחד עם סיכום הטיפול."
            />
          </Panel>
        ) : null}
      </div>
    </TechShell>
  )
}
