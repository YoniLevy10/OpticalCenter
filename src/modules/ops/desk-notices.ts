import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listDocuments } from '@/lib/data/ops-ledger'
import type { Actor } from '@/lib/auth/types'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { duePapersFrom } from '@/modules/ops/agent-chat'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { listTickets } from '@/modules/tickets/service'
import { ticketIsUrgent } from '@/modules/tickets/urgent'
import { recommendBundles, type BundleFault } from '@/modules/whatsapp/agent/bundle'

export type DeskBundle = {
  href: string
  storeName: string
  extra: number
}

export type DeskNotices = {
  approvals: number
  documents: number
  bundles: DeskBundle[]
}

const EMPTY: DeskNotices = { approvals: 0, documents: 0, bundles: [] }

type OpenTicket = {
  id: string
  status: string
  priority: string
  urgent?: boolean | null
  store_id?: string | null
  region_id?: string | null
  category?: string | null
  title?: string | null
  description?: string | null
  created_at: string
  stores?: { name?: string | null; code?: string | null } | null
  organization_id?: string | null
  country_id?: string | null
  assigned_to?: string | null
}

/** Counts the desk cards used to show on the home, so the sidebar can carry them. */
export async function loadDeskNotices(actor: Actor | null): Promise<DeskNotices> {
  try {
    await hydrateOpsLedger()
    const openResult = await listTickets({
      limit: 150,
      statuses: [...OPEN_TICKET_STATUSES],
    }).catch(() => ({ tickets: [] as OpenTicket[] }))
    const fetched = (openResult.tickets ?? []) as unknown as OpenTicket[]
    const open = actor ? scopeTicketsForActor(actor, fetched) : fetched
    const approvals = open.filter(
      (ticket) => ticketIsUrgent(ticket) && ticket.status !== 'engaged',
    ).length
    const bundles = recommendBundles({
      open: open.map(
        (ticket): BundleFault => ({
          id: ticket.id,
          storeId: ticket.store_id || '',
          storeName: ticket.stores?.name || ticket.stores?.code || 'סניף',
          category: ticket.category || 'other',
          priority: ticket.priority,
          status: ticket.status,
          summary: ticket.title || ticket.description || '',
          createdAt: ticket.created_at,
          regionId: ticket.region_id,
          urgent: ticketIsUrgent(ticket),
          dispatched: ticket.status === 'engaged' || ticket.status === 'waiting_vendor',
        }),
      ),
    })
      .filter((card) => card.kind === 'urgent' && card.ticketIds.length > 1)
      .map((card) => ({
        href: `/ops/tickets/${card.ticketIds[0]}`,
        storeName: card.storeName,
        extra: Math.max(1, card.ticketIds.length - 1),
      }))
    return {
      approvals,
      documents: duePapersFrom(listDocuments()).length,
      bundles,
    }
  } catch {
    return EMPTY
  }
}
