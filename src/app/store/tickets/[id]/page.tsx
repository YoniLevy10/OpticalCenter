import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getById } from '@/modules/tickets/service'
import { StatusLabel } from '@/components/ui/signal'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { StoreConfirmButton } from '../store-confirm-button'
import {
  TICKET_CATEGORY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function StoreTicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { id } = await params
  let ticket
  try {
    ticket = await getById(id)
  } catch {
    ticket = null
  }
  if (!ticket) notFound()

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <p className="t-meta text-ink-2">
          {ticket.display_number ?? ticket.id.slice(0, 8)}
        </p>
        <h1 className="t-title mt-1 text-ink">
          {ticket.stores?.name ?? 'תקלה'}
        </h1>
        <p className="t-body mt-2 whitespace-pre-wrap text-ink-2">
          {ticket.description || ticket.title || 'ללא תיאור'}
        </p>
        <div className="mt-3">
          <StatusLabel status={ticket.status as TicketStatus} />
        </div>
      </div>

      <Panel>
        <dl className="divide-y divide-border">
          <KeyValue label="סוג">
            {TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category}
          </KeyValue>
          <KeyValue label="טכנאי">
            {ticket.assignee?.full_name ||
              ticket.assignee?.email ||
              '—'}
          </KeyValue>
        </dl>
      </Panel>

      <StoreConfirmButton
        ticketId={ticket.id}
        initialStatus={ticket.status}
      />

      <Button asChild variant="ghost" size="touch" className="self-start">
        <Link href="/store">חזרה לרשימה</Link>
      </Button>
    </div>
  )
}
