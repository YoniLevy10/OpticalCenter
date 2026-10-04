import { notFound, redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  KeyValue,
} from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { StatusLabel } from '@/components/ui/signal'
import { EvidenceGrid } from '@/components/ui/evidence'
import {
  TICKET_CATEGORY_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import {
  getById,
  listInternalTechnicians,
  countOpenTicketsByAssignee,
} from '@/modules/tickets/service'
import {
  fetchTicketAttachments,
  mergeEvidence,
} from '@/modules/tickets/attachments'
import { TicketActions } from './ticket-actions'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'
import {
  plainAgoHe,
  plainOpenForHe,
  plainUrgency,
  storeLabel,
} from '@/components/ops/plain-labels'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const resolvedClient = await resolveTicketsSupabase(actor)

  const [ticket, technicians, storedAttachments, openCountByTech] =
    await Promise.all([
      getById(id, { client: resolvedClient?.client }).catch(() => null),
      listInternalTechnicians().catch(() => []),
      fetchTicketAttachments(id).catch(() => []),
      countOpenTicketsByAssignee({ client: resolvedClient?.client }).catch(
        () => new Map<string, number>(),
      ),
    ])

  if (!ticket) notFound()
  if (actor && !actorCanAccessTicket(actor, ticket)) notFound()

  const techOptions = technicians.map((t) => ({
    id: t.id,
    full_name: t.full_name,
    email: t.email,
    openCount: openCountByTech.get(t.id) ?? 0,
  }))

  const attachments = mergeEvidence(storedAttachments, ticket.messages ?? [])
  const assignee =
    ticket.assignee ??
    technicians.find((t) => t.id === ticket.assigned_to) ??
    null
  const openFor = plainOpenForHe(ticket.created_at, ticket)
  const storeHeading = storeLabel(ticket.stores)
  const whatsBroken = ticket.description || ticket.title || 'ללא תיאור'
  const reporter =
    ticket.reporter_name?.trim() ||
    ticket.reporter_phone?.trim() ||
    'דיווח מהחנות'

  const storyLines: string[] = [`נפתחה על ידי ${reporter}`]
  if (assignee) {
    storyLines.push(
      `שויכה ל${assignee.full_name || assignee.email || 'טכנאי'}`,
    )
  }
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    storyLines.push('הסתיימה')
  }

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-actions-hq stagger md:pb-0">
        <PageToolbar backHref="/ops/tickets" backLabel="חזרה" showRefresh />

        <OpsPageHero
          eyebrow={
            ticket.display_number ||
            (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
          }
          title={storeHeading}
          status={whatsBroken}
          footer={
            <>
              <StatusLabel status={ticket.status as TicketStatus} />
              <span
                className={cn(
                  't-body',
                  openFor.overdue
                    ? 'text-[var(--signal-critical)]'
                    : 'text-ink-2',
                )}
              >
                {openFor.text}
              </span>
            </>
          }
        />

        <Panel elevated>
          <dl className="divide-y divide-border">
            <KeyValue label="נפתחה">
              {plainAgoHe(ticket.created_at)}
            </KeyValue>
            <KeyValue label="דחיפות">
              {plainUrgency(ticket.priority as TicketPriority)}
            </KeyValue>
            <KeyValue label="טכנאי">
              {assignee ? (
                assignee.full_name || assignee.email || 'טכנאי'
              ) : (
                <span className="text-[var(--signal-critical)]">לא משויך</span>
              )}
            </KeyValue>
            <KeyValue label="סוג תקלה">
              {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
            </KeyValue>
          </dl>
        </Panel>

        {attachments.length > 0 ? (
          <Panel elevated>
            <p className="t-section mb-3 text-ink">תיעוד</p>
            <EvidenceGrid attachments={attachments} />
          </Panel>
        ) : null}

        <Panel elevated>
          <p className="t-section mb-3 text-ink">מה קרה עד עכשיו</p>
          <ul className="space-y-2">
            {storyLines.map((line) => (
              <li key={line} className="t-body text-ink-2">
                · {line}
              </li>
            ))}
          </ul>
        </Panel>

        {/* Single mount: sticky dock on mobile, inline panel on md+ */}
        <div className="hq-ticket-dock fixed inset-x-0 border-t border-border bg-surface/95 p-3 shadow-[var(--shadow-2)] backdrop-blur-md md:static md:inset-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          <TicketActions
            ticketId={ticket.id}
            status={ticket.status as TicketStatus}
            assignedTo={ticket.assigned_to}
            assigneeName={
              assignee?.full_name || assignee?.email || null
            }
            technicians={techOptions}
          />
        </div>
      </div>
    </OpsAppShell>
  )
}
