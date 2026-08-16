import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
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
import { TicketActions } from './ticket-actions'

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

  let ticket
  try {
    ticket = await getById(id)
  } catch {
    ticket = null
  }
  if (!ticket) notFound()

  const [technicians, storedAttachments] = await Promise.all([
    listInternalTechnicians().catch(() => []),
    fetchTicketAttachments(ticket.id),
  ])
  const display =
    ticket.display_number ??
    (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))

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

  return (
    <AppShell>
      <div className="space-y-4 max-md:pb-actions-hq">
        {/* Breadcrumb — quiet, one line, never a heading. */}
        <nav className="flex items-center gap-1">
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

        {/* ---------- Answer block: what / where / how urgent / who ---------- */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <h1 className="t-display text-ink">
                {ticket.title || ticket.description}
              </h1>
              <p className="t-body mt-1.5 text-ink-2">
                {ticket.stores ? (
                  <>
                    {ticket.stores.name}
                    <span className="t-num text-ink-3">
                      {' '}
                      · #{ticket.stores.code}
                    </span>
                    {ticket.stores.city ? ` · ${ticket.stores.city}` : ''}
                  </>
                ) : (
                  'חנות לא ידועה'
                )}
              </p>
            </div>

            <dl className="flex shrink-0 flex-wrap items-start gap-x-8 gap-y-3">
              <div>
                <dt className="t-caption text-ink-3">עדיפות</dt>
                <dd className="mt-1">
                  <PriorityText priority={ticket.priority as TicketPriority} />
                </dd>
              </div>
              <div>
                <dt className="t-caption text-ink-3">סטטוס</dt>
                <dd className="mt-1">
                  <StatusLabel status={ticket.status as TicketStatus} />
                </dd>
              </div>
              <div>
                <dt className="t-caption text-ink-3">אחראי</dt>
                <dd className="t-body mt-1 text-ink">
                  {assignee?.full_name || assignee?.email || 'לא משויך'}
                </dd>
              </div>
              <div>
                <dt className="t-caption text-ink-3">SLA</dt>
                <dd className="mt-1">
                  <SlaBlock view={slaView} />
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------- Main column ---------- */}
          <div className="space-y-4">
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

            <Panel flush>
              <PanelHeader title="כרונולוגיה" meta={`${activity.length} רשומות`} />
              <Timeline items={activity} />
            </Panel>
          </div>

          {/* ---------- Side column ---------- */}
          <div className="space-y-4">
            {/*
              Sticky above bottom nav on mobile (thumb zone); in-flow sidebar
              panel on md+. Single TicketActions instance keeps state coherent.
            */}
            <div
              className="fixed inset-x-0 z-20 max-h-[min(50dvh,420px)] overflow-y-auto border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur-sm bottom-[calc(var(--bottomnav-h)+var(--safe-b))] md:static md:inset-auto md:bottom-auto md:z-auto md:max-h-none md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
            >
              <Panel className="mb-3 md:mb-0">
                <h2 className="t-section mb-1 text-ink">פעולות</h2>
                <p className="t-caption mb-4 text-ink-3">
                  המעברים המותרים נגזרים ממכונת המצבים
                </p>
                <TicketActions
                  ticketId={ticket.id}
                  status={ticket.status as TicketStatus}
                  assignedTo={ticket.assigned_to}
                  technicians={technicians}
                />
              </Panel>
            </div>

            <Panel>
              <h2 className="t-section mb-1 text-ink">פרטים</h2>
              <dl className="divide-y divide-border">
                <KeyValue label="קטגוריה">
                  {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
                </KeyValue>
                <KeyValue label="מקור">
                  {TICKET_SOURCE_LABELS_HE[
                    ticket.source as TicketSourceLabel
                  ] ?? ticket.source}
                </KeyValue>
                <KeyValue label="נפתחה">{fmt(ticket.created_at)}</KeyValue>
                <KeyValue label="גיל">
                  <LiveAge createdAt={ticket.created_at} />
                </KeyValue>
                <KeyValue label="מדווח">
                  {ticket.reporter_name ?? 'לא ידוע'}
                </KeyValue>
                {ticket.reporter_phone ? (
                  <KeyValue label="טלפון" ltr>
                    {ticket.reporter_phone}
                  </KeyValue>
                ) : null}
                {ticket.stores?.address ? (
                  <KeyValue label="כתובת">{ticket.stores.address}</KeyValue>
                ) : null}
                {ticket.resolved_at ? (
                  <KeyValue label="נפתרה">{fmt(ticket.resolved_at)}</KeyValue>
                ) : null}
              </dl>
            </Panel>

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
    </AppShell>
  )
}
