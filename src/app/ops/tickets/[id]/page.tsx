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
  normalizeTicketCategory,
  TICKET_CATEGORY_LABELS_HE,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { getById } from '@/modules/tickets/service'
import {
  fetchTicketAttachments,
  mergeEvidence,
} from '@/modules/tickets/attachments'
import { EngagementPanel } from './engagement-panel'
import { Tx } from '@/components/i18n/tx'
import { Timeline } from '@/components/ui/timeline'
import { buildActivityDesc } from '@/modules/tickets/activity'
import { phrase } from '@/lib/i18n/phrases'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
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
import { TicketTrueCostPanel } from './ticket-true-cost'
import { listOutcomes, listSpends, spendsForAsset, spendsForTicket } from '@/lib/data/ops-ledger'
import { formatIls, trueCostBreakdown } from '@/modules/spend/true-cost'
import {
  bandFromPrices,
  categorySamples,
  estimateFaultCost,
  formatCostBand,
} from '@/modules/recommendations/estimate'
import { PhoneFold as TicketFold, PhoneFoldStack as TicketFoldStack } from '@/components/layout/phone-fold'
import { formatQualityHoldHe, isQualityHoldActive } from '@/modules/tickets/quality-hold'
import { formatRepairEtaHe } from '@/modules/tickets/repair-eta'
import { ticketDecision } from '@/modules/decisions/queue'
import { lockedEngagementFor } from '@/modules/engagements/service'
import { loadMidragResults } from '@/modules/vendors/midrag/live-results'
import { recommendBundles, type BundleFault } from '@/modules/whatsapp/agent/bundle'
import { ticketIsUrgent } from '@/modules/tickets/urgent'

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

  const [ticket, storedAttachments] = await Promise.all([
    getById(id, { client: resolvedClient?.client }).catch(() => null),
    fetchTicketAttachments(id).catch(() => []),
  ])

  if (!ticket) notFound()
  if (actor && !actorCanAccessTicket(actor, ticket)) notFound()

  const attachments = mergeEvidence(storedAttachments, ticket.messages ?? [])
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
  const urgent = ticketIsUrgent(ticket)
  const locked = await lockedEngagementFor(ticket.id).catch(() => null)
  const midrag =
    urgent && ticket.status !== 'engaged'
      ? await loadMidragResults({
          category: ticket.category,
          city: ticket.stores?.city ?? null,
        }).catch(() => null)
      : null
  const openForBundle = (history.tickets ?? []).filter((row) => row.id !== ticket.id)
  const bundleCards = recommendBundles({
    open: [
      {
        id: ticket.id,
        storeId: ticket.store_id,
        storeName,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        summary: ticket.description,
        createdAt: ticket.created_at,
        regionId: ticket.region_id,
        urgent,
      },
      ...openForBundle.map(
        (row): BundleFault => ({
          id: row.id,
          storeId: row.store_id,
          storeName: row.stores?.name || row.stores?.code || 'סניף',
          category: row.category,
          priority: row.priority,
          status: row.status,
          summary: row.title || row.description,
          createdAt: row.created_at,
          regionId: row.region_id,
          urgent: ticketIsUrgent(row),
        }),
      ),
    ],
  })
  const companionIds =
    bundleCards.find((card) => card.kind === 'urgent' && card.ticketIds[0] === ticket.id)
      ?.ticketIds.slice(1) ?? []
  const companions = companionIds.map((id) => {
    const row = openForBundle.find((item) => item.id === id)
    return {
      id,
      storeName: row?.stores?.name || storeName,
      summary: row?.title || row?.description || 'תקלה',
    }
  })
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
  const categoryByTicketId: Record<string, string> = {}
  for (const row of history.tickets ?? []) {
    if (row.category) categoryByTicketId[row.id] = row.category
  }
  categoryByTicketId[ticket.id] = ticket.category
  const recordedBand = bandFromPrices(
    categorySamples({
      outcomes: listOutcomes(),
      spends: listSpends(),
      categoryByTicketId,
    }).get(normalizeTicketCategory(ticket.category)) ?? [],
  )
  const faultEstimate = estimateFaultCost(ticket.category, recordedBand)

  const storyLines: string[] = [`${p('נפתחה על ידי')} ${reporter}`]
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
  const estimateText = formatCostBand(faultEstimate.band)
  const costSummary =
    cost.count === 0 ? `משוער ${estimateText}` : formatIls(cost.total)
  const stepLabel =
    ticket.status === 'engaged'
      ? 'החנות מתאמת'
      : urgent
        ? 'מחכה לאישור'
        : 'לא דחוף'

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

        {verb === 'לאשר' ? (
          <div className="flex items-center justify-end px-1">
            <Button asChild variant="primary" size="sm">
              <Link href="#ticket-actions">לאשר</Link>
            </Button>
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
            <KeyValue phoneTile label="השלב">
              {stepLabel}
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

        {treatmentSummary ? (
          <p className="t-body px-1 text-ink-2">{treatmentSummary}</p>
        ) : null}

        <TicketFoldStack>
          <TicketFold title={tx('ticket.trueCost')} summary={costSummary}>
            <TicketTrueCostPanel
              ticketSpends={ticketSpends}
              assetSpends={assetSpends}
              locale={locale}
              estimate={{ text: estimateText, basis: faultEstimate.basis }}
            />
          </TicketFold>

          <TicketFold title={p('מה קרה עד עכשיו')} summary={latestSummary}>
            <Panel elevated flush className="overflow-hidden">
              {hits.length > 0 ? (
                <div className="border-b border-border px-5 py-3">
                  <p className="t-body-strong text-ink">
                    <Tx text="אירועים דומים" />
                  </p>
                  <p className="t-meta mt-1 text-ink-2">{recurrenceBasis(hits)}</p>
                  {prevention ? <p className="t-body mt-2 text-ink">{prevention}</p> : null}
                </div>
              ) : null}
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
        </TicketFoldStack>

        <div id="ticket-actions">
          <EngagementPanel
            ticketId={ticket.id}
            urgent={urgent}
            status={ticket.status}
            locked={locked}
            pros={midrag?.pros ?? []}
            searchUrl={midrag?.searchUrl ?? 'https://www.midrag.co.il/Search/InSector'}
            fallback={midrag?.fallback ?? true}
            companions={companions}
          />
        </div>
      </div>
    </OpsAppShell>
  )
}
