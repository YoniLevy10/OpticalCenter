import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getById } from '@/modules/tickets/service'
import { StatusLabel } from '@/components/ui/signal'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
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
    <div className="mx-auto flex max-w-lg flex-col gap-5 stagger">
      <OpsPageHero
        eyebrow={ticket.display_number ?? ticket.id.slice(0, 8)}
        title={ticket.stores?.name ?? 'תקלה'}
        status={ticket.description || ticket.title || 'ללא תיאור'}
        footer={<StatusLabel status={ticket.status as TicketStatus} />}
      />

      <Panel elevated>
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
