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
import { TicketMidragPanel } from './ticket-midrag-panel'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'
import {
  plainAgoHe,
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'
import { cn } from '@/lib/utils'
import { listTickets } from '@/modules/tickets/service'
import { findRecurrences, recurrenceBasis, suggestPrevention } from '@/modules/tickets/recurrence'
import { getLocale } from '@/lib/i18n/server'
import { translate, type MessageKey } from '@/lib/i18n/messages'
import { TicketTrialPanel } from './ticket-trial-panel'
import { matchProfessionalsForFault } from '@/modules/professionals/match-fault'
import { listProfessionals } from '@/modules/professionals/service'
import { suggestVendorsForTicket } from '@/modules/vendors/service'
import { windowsFromSettings } from '@/modules/tickets/sla'
import { getSettings } from '@/modules/settings/service'

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

  const history = await listTickets({ limit: 200 }).catch(() => ({ tickets: [] }))
  const hits = findRecurrences(
    {
      id: ticket.id,
      storeId: ticket.store_id,
      category: ticket.category,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.created_at,
    },
    (history.tickets ?? []).map((row) => ({
      id: row.id,
      storeId: row.store_id,
      category: row.category,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      resolutionNote: null,
    })),
  )
  const prevention = suggestPrevention(hits)
  const locale = await getLocale()
  const tx = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  const categoryKey = `category.${ticket.category}` as MessageKey
  const knownCategory = [
    'hvac',
    'electrical',
    'electrical_hazard',
    'plumbing',
    'security',
    'it',
    'cleaning',
    'other',
  ].includes(ticket.category)
  const categoryLabel = knownCategory
    ? tx(categoryKey)
    : (TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category)
  const priority = ticket.priority as TicketPriority
  const [{ settings }, pros, vendors] = await Promise.all([
    getSettings().catch(() => ({
      settings: {
        sla_respond_hours_critical: 1,
        sla_respond_hours_high: 2,
        sla_respond_hours_medium: 4,
        sla_respond_hours_low: 8,
      },
    })),
    listProfessionals({ limit: 40 }).catch(() => ({ professionals: [] })),
    suggestVendorsForTicket({
      category: ticket.category,
      regionId: ticket.region_id,
    }).catch(() => ({ matches: [] })),
  ])
  const slaWindow = windowsFromSettings(settings)[priority]
  const proMatches = matchProfessionalsForFault(
    pros.professionals,
    ticket.category,
  ).slice(0, 3)
  const vendorMatches = vendors.matches.slice(0, 2).map((row) => ({
    id: row.id,
    name: row.name,
    detail: row.specialties,
    phone: row.contact_phone ?? null,
    reason: row.reason,
  }))
  const people = [
    ...proMatches.map((row) => ({
      id: row.id,
      name: row.full_name,
      detail: row.trade ?? '',
      phone: row.phone,
      reason: row.reason,
    })),
    ...vendorMatches,
  ]

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
            <KeyValue label={tx('ticket.opened')}>
              {plainAgoHe(ticket.created_at)}
            </KeyValue>
            <KeyValue label={tx('ticket.urgency')}>
              {tx(`priority.${priority}`)}
            </KeyValue>
            <KeyValue label={tx('ticket.tech')}>
              {assignee ? (
                assignee.full_name || assignee.email || 'טכנאי'
              ) : (
                <span className="text-[var(--signal-critical)]">{tx('ticket.unassigned')}</span>
              )}
            </KeyValue>
            <KeyValue label={tx('ticket.category')}>
              {categoryLabel}
            </KeyValue>
          </dl>
        </Panel>

        {hits.length > 0 ? (
          <Panel elevated>
            <p className="t-section mb-3 text-ink">אירועים דומים</p>
            <p className="t-meta mb-2 text-ink-2">{recurrenceBasis(hits)}</p>
            <ul className="space-y-1">
              {hits.slice(0, 5).map((hit) => (
                <li key={hit.ticket.id} className="t-body text-ink-2">
                  {hit.ticket.description} · {hit.reason}
                </li>
              ))}
            </ul>
            {prevention ? <p className="t-body mt-2">{prevention}</p> : null}
          </Panel>
        ) : null}

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

        <TicketTrialPanel
          ticketId={ticket.id}
          description={whatsBroken}
          priority={priority}
          category={ticket.category}
          status={ticket.status}
          slaRespondBy={ticket.sla_respond_by}
          slaResolveBy={ticket.sla_resolve_by}
          firstResponseAt={ticket.first_response_at}
          resolvedAt={ticket.resolved_at}
          respondHours={slaWindow.respondHours}
          resolveHours={slaWindow.resolveHours}
          storeId={ticket.store_id}
          storeCode={ticket.stores?.code ?? ''}
          storeName={ticket.stores?.name ?? storeHeading}
          matches={people}
        />

        {/* Midrag is body content — not next to assign/close */}
        <TicketMidragPanel
          category={ticket.category}
          city={ticket.stores?.city ?? null}
        />

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
