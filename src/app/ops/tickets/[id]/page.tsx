import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
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
import { getSlaView } from '@/modules/tickets/sla-display'
import { buildActivity } from '@/modules/tickets/activity'
import {
  fetchTicketAttachments,
  mergeEvidence,
} from '@/modules/tickets/attachments'
import { listAssets } from '@/modules/assets/service'
import { TicketActions } from './ticket-actions'
import { TicketShareBar } from '@/components/ops/ticket-share-bar'
import { PhoneCallLink } from '@/components/ui/phone-call-link'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorCanAccessTicket } from '@/lib/auth/ticket-scope'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm')
  } catch {
    return '—'
  }
}

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
          <KeyValue label="נכס">
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
    <Panel>
      <h2 className="t-section mb-1 text-ink">SLA ותאריכים</h2>
      <dl className="divide-y divide-border">
        <KeyValue label="SLA">
          <SlaBlock view={slaView} />
        </KeyValue>
        <KeyValue label="נפתחה">{fmt(ticket.created_at)}</KeyValue>
        <KeyValue label="גיל">
          <LiveAge createdAt={ticket.created_at} />
        </KeyValue>
        <KeyValue label="עודכנה">{fmt(ticket.updated_at)}</KeyValue>
        {ticket.resolved_at ? (
          <KeyValue label="נפתרה">{fmt(ticket.resolved_at)}</KeyValue>
        ) : null}
        <KeyValue label="קטגוריה">
          {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
        </KeyValue>
        <KeyValue label="מקור">
          {TICKET_SOURCE_LABELS_HE[ticket.source as TicketSourceLabel] ??
            ticket.source}
        </KeyValue>
      </dl>
    </Panel>
  )

  const actionsPanel = (
    <Panel className="mb-3 md:mb-0">
      <h2 className="t-section mb-1 text-ink">פעולות</h2>
      <p className="t-caption mb-4 text-ink-3">
        פעולות זמינות לפי הסטטוס הנוכחי
      </p>
      <TicketActions
        ticketId={ticket.id}
        status={ticket.status as TicketStatus}
        assignedTo={ticket.assigned_to}
        technicians={technicians}
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
      <div className="flex flex-col gap-4">
        <PageToolbar backHref="/ops/tickets" backLabel="חזרה לתקלות" showRefresh />

        {/* Breadcrumb — quiet, one line, never a heading. */}
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

        {/* ---------- Header: number first, then status / priority / assignee ---------- */}
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
              <span className="t-num text-ink-3">
                {' '}
                · #{ticket.stores.code}
              </span>
              {ticket.stores.city ? ` · ${ticket.stores.city}` : ''}
            </p>
          ) : (
            <p className="t-body mt-2 text-ink-2">חנות לא ידועה</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="t-caption text-ink-3">סטטוס</span>
              <StatusLabel status={ticket.status as TicketStatus} />
            </div>
            <span aria-hidden className="hidden h-3.5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="t-caption text-ink-3">עדיפות</span>
              <PriorityText priority={ticket.priority as TicketPriority} />
            </div>
            <span aria-hidden className="hidden h-3.5 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="t-caption text-ink-3">אחראי</span>
              <span className="t-body-strong text-ink">
                {assignee?.full_name || assignee?.email || 'לא משויך'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------- Main column ---------- */}
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
                <PanelHeader
                  title="תיעוד מהשטח"
                  meta={`${attachments.length} פריטים`}
                />
                <div className="p-4">
                  <EvidenceGrid attachments={attachments} />
                </div>
              </Panel>
            ) : null}

            {/* Actions in document flow on mobile — no fixed overlay */}
            <div className="md:hidden">{actionsPanel}</div>
            <div className="md:hidden">{contextPanel}</div>
            <div className="md:hidden">{slaDatesPanel}</div>

            <Panel flush data-visual="ticket-timeline">
              <PanelHeader title="כרונולוגיה" meta={`${activity.length} רשומות`} />
              <Timeline items={activity} />
            </Panel>
          </div>

          {/* ---------- Side column (desktop) ---------- */}
          <div className="hidden space-y-4 md:block lg:sticky lg:top-4 lg:self-start">
            {actionsPanel}
            {contextPanel}
            {slaDatesPanel}

            {attachments.length === 0 ? (
              <Panel flush>
                <EmptyState
                  title="אין תיעוד מצורף"
                  description="תמונות שנשלחו ב־WhatsApp או צולמו בשטח יופיעו כאן."
                  className="py-10"
                />
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </OpsAppShell>
  )
}
