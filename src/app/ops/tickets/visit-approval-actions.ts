'use server'

import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import {
  applySpendDecision,
  createSpend,
  spendForTicket,
} from '@/lib/data/ops-ledger'
import { persistOpsLedger } from '@/lib/data/ops-db'
import { getById } from '@/modules/tickets/service'

/** Ari clears the visit block. One call, then the sheet sends those tickets. */
export async function approveVisitCommitments(
  ticketIds: string[],
  vendorName: string,
) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) throw new Error('נדרשת כניסה')
  const allowed =
    !actor ||
    actor.memberships.some(
      (membership) =>
        membership.role === 'global_admin' ||
        membership.role === 'global_maintenance',
    )
  if (!allowed) throw new Error('אישור הוצאה שמור לארי')
  const name = actor?.full_name || 'ארי'
  const ids = [...new Set(ticketIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('אין תקלה לאשר')

  for (const ticketId of ids) {
    const ticket = await getById(ticketId)
    if (!ticket) throw new Error('תקלה לא נמצאה')
    const existing = spendForTicket(ticketId)
    if (existing?.status === 'rejected') throw new Error('הבקשה נדחתה')
    if (existing?.status === 'approved' && !existing.needsReapproval) continue
    const spend =
      existing ??
      createSpend({
        storeId: ticket.store_id,
        storeCode: ticket.stores?.code ?? '',
        storeName: ticket.stores?.name ?? '',
        ticketId,
        reason: ticket.title || ticket.description || 'שיגור ביקור',
        vendorName: vendorName.trim() || null,
        requestedAmount: 0,
        scope: 'אישור שיגור — המחיר עדיין לא נעול',
        urgent: false,
        actor: name,
      })
    applySpendDecision(spend.id, 'approved', name)
  }
  await persistOpsLedger()
}
