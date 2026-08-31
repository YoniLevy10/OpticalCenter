import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  PanelHeader,
  KeyValue,
  EmptyState,
} from '@/components/ui/primitives'
import { PriorityText, SlaBlock, StatusLabel } from '@/components/ui/signal'
import { Timeline } from '@/components/ui/timeline'
import { EvidenceGrid } from '@/components/ui/evidence'
import { LiveAge } from '@/components/ui/time'
import {
  TICKET_CATEGORY_LABELS_HE,
  TICKET_SOURCE_LABELS_HE,
  type TicketPriority,
  type TicketSourceLabel,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { getById, listInternalTechnicians } from '@/modules/tickets/service'
import { formatDateTimeHe, getSlaView } from '@/modules/tickets/sla-display'
import { buildActivity } from '@/modules/tickets/activity'
import {
  fetchTicketAttachments,
  mergeEvidence,
} from '@/modules/tickets/attachments'
import { listAssets } from '@/modules/assets/service'
import { TicketActions } from './ticket-actions'
import { TicketShareBar } from '@/components/ops/ticket-share-bar'
import { TicketNextStep } from '@/components/ops/ticket-next-step'
import { PhoneCallLink } from '@/components/ui/phone-call-link'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'

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

  // Prefer user-scoped client when authVia === supabase_session.
  const resolved = await resolveTicketsSupabase(actor)
  let ticket
  try {
    ticket = await getById(id, { client: resolved?.client })
  } catch {
    ticket = null
  }
  if (!ticket) notFound()
  if (actor && !actorCanAccessTicket(actor, ticket)) notFound()

  const [technicians, storedAttachments, assetResult] = await Promise.all([
    listInternalTechnicians().catch(() => []),
    fetchTicketAttachments(ticket.id),
    ticket.store_id
      ? listAssets({ storeId: ticket.store_id }).catch(() => ({
          assets: [],
          backend: 'memory' as const,
        }))
      : Promise.resolve({ assets: [], backend: 'memory' as const }),
  ])
  const display =
    ticket.display_number ??
    (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))

  const linkedAsset = ticket.asset_id
    ? assetResult.assets.find((a) => a.id === ticket.asset_id)
    : null

  const slaView = getSlaView({
    priority: ticket.priority,
    status: ticket.status,
    sla_respond_by: ticket.sla_respond_by,
    sla_resolve_by: ticket.sla_resolve_by,
    resolved_at: ticket.resolved_at,
    created_at: ticket.created_at,
  })

  const activity = buildActivity(ticket.messages ?? [], ticket.events ?? [])
  // WhatsApp photos live on message.media_url; field photos on ticket_attachments.
  const attachments = mergeEvidence(storedAttachments, ticket.messages ?? [])

  const assignee = technicians.find((t) => t.id === ticket.assigned_to)

  const contextPanel = (
    <Panel>
      <h2 className="t-section mb-1 text-ink">הקשר</h2>
      <dl className="divide-y divide-border">
        <KeyValue label="סניף">
          {ticket.stores ? (
            <Link
              href={`/ops/stores/${encodeURIComponent(ticket.stores.code)}`}
              className="text-ink hover:underline"
            >
              {ticket.stores.name}
              {ticket.stores.code ? (
                <span className="t-num text-ink-3"> · #{ticket.stores.code}</span>
              ) : null}
            </Link>
          ) : (
            '—'
          )}
        </KeyValue>
        {ticket.stores?.city ? (
          <KeyValue label="עיר">{ticket.stores.city}</KeyValue>
        ) : null}
        {ticket.stores?.address ? (
          <KeyValue label="כתובת">{ticket.stores.address}</KeyValue>
        ) : null}
        {linkedAsset || ticket.asset_id ? (
          <KeyValue label="ציוד">
            {linkedAsset
              ? `${linkedAsset.name}${linkedAsset.code ? ` · ${linkedAsset.code}` : ''}`
              : ticket.asset_id!.slice(0, 8)}
          </KeyValue>
        ) : null}
        <KeyValue label="איש קשר">
          {ticket.reporter_name ?? 'לא ידוע'}
        </KeyValue>
        {ticket.reporter_phone ? (
          <KeyValue label="טלפון">
            <PhoneCallLink phone={ticket.reporter_phone} />
          </KeyValue>
        ) : null}
      </dl>
    </Panel>
  )

  const slaDatesPanel = (
    <details className="group rounded-[var(--radius-lg)] border border-border/80 bg-surface">
      <summary className="t-section cursor-pointer list-none px-5 py-4 text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        פרטים נוספים
        <span className="t-caption ms-2 font-normal text-ink-3">
          זמנים · מקור · קטגוריה
        </span>
      </summary>
      <div className="border-t border-border px-5 pb-4">
        <dl className="divide-y divide-border">
          <KeyValue label="זמן טיפול">
            <SlaBlock view={slaView} />
          </KeyValue>
          <KeyValue label="נפתחה">{formatDateTimeHe(ticket.created_at)}</KeyValue>
          <KeyValue label="גיל">
            <LiveAge createdAt={ticket.created_at} />
          </KeyValue>
          <KeyValue label="עודכנה">{formatDateTimeHe(ticket.updated_at)}</KeyValue>
          {ticket.resolved_at ? (
            <KeyValue label="הסתיימה">{formatDateTimeHe(ticket.resolved_at)}</KeyValue>
          ) : null}
          <KeyValue label="סוג">
            {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
          </KeyValue>
          <KeyValue label="מאיפה הגיעה">
            {TICKET_SOURCE_LABELS_HE[ticket.source as TicketSourceLabel] ??
              ticket.source}
          </KeyValue>
        </dl>
      </div>
    </details>
  )

  const actionsPanel = (assigneeFieldId: string) => (
    <Panel className="mb-3 md:mb-0">
      <h2 className="t-section mb-3 text-ink">מה אפשר לעשות</h2>
      <TicketNextStep
        status={ticket.status as TicketStatus}
        assignedTo={ticket.assigned_to}
        slaRespondBy={ticket.sla_respond_by}
        slaResolveBy={ticket.sla_resolve_by}
        firstResponseAt={ticket.first_response_at}
        resolvedAt={ticket.resolved_at}
        className="mb-4"
      />
      <TicketActions
        ticketId={ticket.id}
        status={ticket.status as TicketStatus}
        assignedTo={ticket.assigned_to}
        technicians={technicians}
        assigneeFieldId={assigneeFieldId}
      />
      <div className="mt-3 border-t border-border pt-3">
        <TicketShareBar
          display={display}
          storeCode={ticket.stores?.code}
          storeName={ticket.stores?.name}
          description={ticket.description}
          techName={assignee?.full_name || assignee?.email}
        />
      </div>
    </Panel>
  )

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4 pb-actions-hq md:pb-0">
        <PageToolbar backHref="/ops/tickets" backLabel="חזרה" showRefresh />

        <nav aria-label="מיקום בעמוד" className="hidden items-center gap-1 md:flex">
          <Link
            href="/ops/tickets"
            className="t-meta text-ink-3 transition-colors hover:text-ink"
          >
            תקלות
          </Link>
          <ChevronRight
            aria-hidden
            className="h-3 w-3 text-ink-3 rtl:rotate-180 ltr:rotate-0"
          />
          <span className="t-meta t-num text-ink-2">{display}</span>
        </nav>

        <header className="border-b border-border pb-5">
          <p className="t-caption t-num text-ink-3">{display}</p>
          <h1 className="t-title mt-1 max-w-4xl text-balance text-ink">
            {ticket.title || ticket.description}
          </h1>
          {ticket.stores ? (
            <p className="t-body mt-2 text-ink-2">
              <Link
                href={`/ops/stores/${encodeURIComponent(ticket.stores.code)}`}
                className="hover:underline"
              >
                {ticket.stores.name}
              </Link>
              <span className="t-num text-ink-3"> · #{ticket.stores.code}</span>
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusLabel status={ticket.status as TicketStatus} />
            <PriorityText priority={ticket.priority as TicketPriority} />
            <span className="t-body text-ink-2">
              {assignee?.full_name || assignee?.email || 'עדיין לא נבחר טכנאי'}
            </span>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {ticket.title && ticket.description !== ticket.title ? (
              <Panel>
                <p className="t-body whitespace-pre-wrap leading-relaxed text-ink">
                  {ticket.description}
                </p>
              </Panel>
            ) : null}

            {attachments.length > 0 ? (
              <Panel flush>
                <PanelHeader title="תיעוד" />
                <div className="p-4">
                  <EvidenceGrid attachments={attachments} />
                </div>
              </Panel>
            ) : null}

            <div className="md:hidden">{contextPanel}</div>
            <div className="md:hidden">{slaDatesPanel}</div>

            <Panel flush data-visual="ticket-timeline">
              <PanelHeader title="כרונולוגיה" />
              <Timeline items={activity} />
            </Panel>
          </div>

          <div className="hidden space-y-4 md:block lg:sticky lg:top-4 lg:self-start">
            {actionsPanel('ticket-assignee')}
            {contextPanel}
            {slaDatesPanel}

            {attachments.length === 0 ? (
              <Panel flush>
                <EmptyState title="אין תיעוד" className="py-10" />
              </Panel>
            ) : null}
          </div>
        </div>

        {/* Mobile sticky action dock above bottom nav */}
        <div className="hq-ticket-dock fixed inset-x-0 border-t border-border bg-surface/95 p-3 shadow-[var(--shadow-2)] backdrop-blur-md md:hidden">
          <div className="mx-auto max-h-[min(40vh,var(--hq-actions-dock-h))] overflow-y-auto">
            {actionsPanel('ticket-assignee-mobile')}
          </div>
        </div>
      </div>
    </OpsAppShell>
  )
}
