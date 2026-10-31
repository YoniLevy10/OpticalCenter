import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  KeyValue,
} from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Button } from '@/components/ui/button'
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
import { PreferredVendorsPanel } from './preferred-vendors-panel'
import { TicketRfqDraftPanel } from './ticket-rfq-draft-panel'
import { Tx } from '@/components/i18n/tx'
import { TECH_COMPLETION } from '@/modules/tech/completion-copy'
import { Timeline } from '@/components/ui/timeline'
import { buildActivityDesc } from '@/modules/tickets/activity'
import { phrase } from '@/lib/i18n/phrases'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
import { canCorrectTicketClassification } from '@/modules/tickets/classification-auth'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'
import {
  plainAgoHe,
  plainOpenForHe,
} from '@/components/ops/plain-labels'
import { cn } from '@/lib/utils'
import { listTickets } from '@/modules/tickets/service'
import { findRecurrences, recurrenceBasis, suggestPrevention } from '@/modules/tickets/recurrence'
import { getLocale } from '@/lib/i18n/server'
import { translate, type MessageKey } from '@/lib/i18n/messages'
import { TicketTrialPanel } from './ticket-trial-panel'
import { TicketTrueCostPanel } from './ticket-true-cost'
import { TicketEtaPanel } from './ticket-eta-panel'
import { matchProfessionalsForFault } from '@/modules/professionals/match-fault'
import { listProfessionals } from '@/modules/professionals/service'
import { suggestVendorsForTicket } from '@/modules/vendors/service'
import { windowsFromSettings } from '@/modules/tickets/sla'
import { getSettings } from '@/modules/settings/service'
import { spendsForAsset, spendsForTicket } from '@/lib/data/ops-ledger'
import { formatIls, trueCostBreakdown } from '@/modules/spend/true-cost'
import { PhoneFold as TicketFold, PhoneFoldStack as TicketFoldStack } from '@/components/layout/phone-fold'
import { formatQualityHoldHe, isQualityHoldActive } from '@/modules/tickets/quality-hold'
import { formatRepairEtaHe } from '@/modules/tickets/repair-eta'
import { ticketDecision } from '@/modules/decisions/queue'

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
  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)
  const openFor = plainOpenForHe(ticket.created_at, ticket, new Date(), locale)
  const decision = ticketDecision(ticket, new Date(), locale)
  const openTicket = !['resolved', 'closed', 'cancelled'].includes(ticket.status)
  const verb = decision
    ? decision.action.split('·')[0]?.trim()
    : openTicket
      ? p('לטפל')
      : null
  const storeName = ticket.stores?.name?.trim() || p('חנות')
  const storeCode = ticket.stores?.code?.trim()
  const whatsBroken = ticket.description || ticket.title || p('ללא תיאור')
  const reporter =
    ticket.reporter_name?.trim() ||
    ticket.reporter_phone?.trim() ||
    p('דיווח מהחנות')

  const history = await listTickets({ limit: 200 }).catch(() => ({ tickets: [] }))
  const hits = findRecurrences(
    {
      id: ticket.id,
      storeId: ticket.store_id,
      category: ticket.category,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.created_at,
      assetId: ticket.asset_id ?? null,
    },
    (history.tickets ?? []).map((row) => ({
      id: row.id,
      storeId: row.store_id,
      category: row.category,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      assetId: row.asset_id ?? null,
      resolutionNote: null,
    })),
  )
  const ticketSpends = spendsForTicket(ticket.id)
  const assetSpends = ticket.asset_id ? spendsForAsset(ticket.asset_id) : []
  const holdLabel = formatQualityHoldHe(ticket.quality_hold_until)
  const holdActive =
    ticket.status === 'resolved' && isQualityHoldActive(ticket.quality_hold_until)
  const etaLabel = formatRepairEtaHe(ticket.repair_eta_at)
  const prevention = suggestPrevention(hits)
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

  const storyLines: string[] = [`${p('נפתחה על ידי')} ${reporter}`]
  if (assignee) {
    storyLines.push(
      `${p('שויכה ל')} ${assignee.full_name || assignee.email || p('טכנאי')}`,
    )
  }
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    storyLines.push(p('הסתיימה'))
  }

  const treatmentSummary = (() => {
    const events = ticket.events ?? []
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
  })()

  const activity = buildActivityDesc(ticket.messages ?? [], ticket.events ?? [])
  const latest = activity[0]
  const latestSummary = latest
    ? [latest.label, latest.body?.trim()].filter(Boolean).join(' · ')
    : p('אין פעילות')
  const cost = trueCostBreakdown(ticketSpends)
  const costSummary =
    cost.count === 0 ? tx('ticket.trueCostEmpty') : formatIls(cost.total)
  const vendorSummary = vendors.matches[0]?.name ?? p('אין התאמה עדיין')

  return (
    <OpsAppShell>
      <div className="ari-home mx-auto flex min-w-0 max-w-2xl flex-col gap-3 overflow-x-clip pb-actions-hq md:gap-5 md:pb-0">
        <PageToolbar backHref="/ops/tickets" backLabel="חזרה" showRefresh />

        <OpsPageHero
          compact
          eyebrow={
            [
              ticket.display_number ||
                (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8)),
              storeCode,
            ]
              .filter(Boolean)
              .join(' · ')
          }
          title={storeName}
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
                {ticket.status === 'resolved'
                  ? 'ממתינה לאישור חנות'
                  : openFor.text}
              </span>
            </>
          }
        />

        {verb ? (
          <div className="hidden items-center justify-end px-1 md:flex">
            {openFor.overdue || !ticket.assigned_to ? (
              <Button asChild variant="primary" size="sm">
                <Link href="#ticket-actions">{verb}</Link>
              </Button>
            ) : (
              <Link href="#ticket-actions" className="t-body text-ink">
                {verb}
              </Link>
            )}
          </div>
        ) : null}

        <Panel elevated className="max-md:p-3">
          <dl className="grid grid-cols-2 gap-2 md:block md:divide-y md:divide-border max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
            <KeyValue phoneTile label={tx('ticket.opened')}>
              {plainAgoHe(ticket.created_at, new Date(), locale)}
            </KeyValue>
            <KeyValue phoneTile label={tx('ticket.urgency')}>
              {tx(`priority.${priority}`)}
            </KeyValue>
            <KeyValue phoneTile label={tx('ticket.tech')}>
              {assignee ? (
                assignee.full_name || assignee.email || 'טכנאי'
              ) : (
                <span className="text-[var(--signal-critical)]">{tx('ticket.unassigned')}</span>
              )}
            </KeyValue>
            <KeyValue phoneTile label={tx('ticket.category')}>
              {categoryLabel}
            </KeyValue>
            {etaLabel ? (
              <KeyValue phoneTile label={tx('ticket.eta')}>{etaLabel}</KeyValue>
            ) : null}
            {holdLabel && (holdActive || ticket.status === 'resolved') ? (
              <KeyValue phoneTile label={tx('ticket.qualityHold')}>{holdLabel}</KeyValue>
            ) : null}
          </dl>
        </Panel>

        <TicketFoldStack>
          {treatmentSummary ? (
            <TicketFold title={TECH_COMPLETION.treatmentLabel} summary={treatmentSummary}>
              <Panel elevated>
                <p className="t-section mb-2 text-ink">
                  {TECH_COMPLETION.treatmentLabel}
                </p>
                <p className="t-body whitespace-pre-wrap text-ink-2">
                  {treatmentSummary}
                </p>
              </Panel>
            </TicketFold>
          ) : null}

          <TicketFold title={tx('ticket.trueCost')} summary={costSummary}>
            <TicketTrueCostPanel
              ticketSpends={ticketSpends}
              assetSpends={assetSpends}
              locale={locale}
            />
          </TicketFold>

          <TicketFold title={tx('ticket.eta')} summary={etaLabel || tx('ticket.etaEmpty')}>
            <TicketEtaPanel
              ticketId={ticket.id}
              initialEtaAt={ticket.repair_eta_at ?? null}
              status={ticket.status}
            />
          </TicketFold>

          {hits.length > 0 ? (
            <TicketFold
              title={p('אירועים דומים')}
              summary={prevention || p(`${hits.length} אירועים קודמים`)}
            >
              <Panel elevated>
                <p className="t-section mb-3 text-ink">
                  <Tx text="אירועים דומים" />
                </p>
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
            </TicketFold>
          ) : null}

          {attachments.length > 0 ? (
            <TicketFold title={p('תיעוד')} summary={p(`${attachments.length} קבצים`)}>
              <Panel elevated>
                <p className="t-section mb-3 text-ink">
                  <Tx text="תיעוד" />
                </p>
                <EvidenceGrid attachments={attachments} />
              </Panel>
            </TicketFold>
          ) : null}

          <TicketFold title={p('מה קרה עד עכשיו')} summary={latestSummary}>
            <Panel elevated flush className="overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <p className="t-section text-ink">
                  <Tx text="מה קרה עד עכשיו" />
                </p>
                {storyLines.length > 0 ? (
                  <p className="t-caption mt-1 text-ink-3">
                    {storyLines.join(' · ')}
                  </p>
                ) : null}
              </div>
              <Timeline items={activity} />
            </Panel>
          </TicketFold>

          <TicketFold
            title={p('סיווג וטיפול')}
            summary={`${categoryLabel} · ${tx(`priority.${priority}`)}`}
          >
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
              storeName={storeName}
              assetId={ticket.asset_id ?? null}
              matches={people}
              aiRaw={ticket.ai_raw ?? null}
              aiSummary={ticket.ai_summary ?? null}
              canCorrect={canCorrectTicketClassification(
                actor,
                shouldAllowDemoEntry(),
              )}
            />
          </TicketFold>

          <TicketFold title={p('ספקים ואנשי מקצוע')} summary={vendorSummary}>
            <PreferredVendorsPanel
              ticketId={ticket.id}
              category={ticket.category}
              regionId={ticket.region_id ?? 'center'}
              city={ticket.stores?.city ?? null}
              initialMatches={vendors.matches.slice(0, 4).map((row) => ({
                id: row.id,
                name: row.name,
                specialties: row.specialties,
                preferred: row.preferred,
                coverage_regions: row.coverage_regions ?? undefined,
                contact_phone: row.contact_phone ?? null,
                notes: row.notes ?? null,
                score: row.score,
                reason: row.reason,
                dispatchable: row.dispatchable,
              }))}
            />
          </TicketFold>

          <TicketFold title={p('הצעת מחיר')} summary={p('נשמרת ידנית, בלי שליחה')}>
            <TicketRfqDraftPanel
              ticketId={ticket.id}
              ticketLabel={
                ticket.display_number ||
                (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
              }
              storeId={ticket.store_id}
              storeCode={ticket.stores?.code ?? ''}
              storeName={storeName}
              trade={ticket.category}
            />
          </TicketFold>
        </TicketFoldStack>

        {/* Single mount: sticky dock on mobile, inline panel on md+ */}
        <div id="ticket-actions" className="hq-ticket-dock fixed inset-x-0 border-t border-border bg-surface/95 p-3 shadow-[var(--shadow-2)] backdrop-blur-md md:static md:inset-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          <TicketActions
            ticketId={ticket.id}
            status={ticket.status as TicketStatus}
            assignedTo={ticket.assigned_to}
            assigneeName={
              assignee?.full_name || assignee?.email || null
            }
            technicians={techOptions}
            canOverrideResolve={Boolean(
              actor?.memberships.some((m) => m.role === 'global_maintenance'),
            )}
          />
        </div>
      </div>
    </OpsAppShell>
  )
}
