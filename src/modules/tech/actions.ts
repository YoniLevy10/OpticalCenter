'use server'

import { patchTechTicket } from '@/modules/tech/service'
import type { TicketStatus } from '@/modules/tickets/constants'
import { getById } from '@/modules/tickets/service'
import { isLifecycleEvent } from '@/modules/notifications/lifecycle'
import { notifyReporter } from '@/modules/notifications/lifecycle-notify'

export async function techUpdateTicketAction(input: {
  ticketId: string
  techId: string
  status?: TicketStatus
  resolution_note?: string
  claim?: boolean
}) {
  const ticket = await patchTechTicket(input)
  if (input.status && isLifecycleEvent(input.status)) {
    try {
      const after = await getById(input.ticketId)
      if (after) await notifyReporter(after, input.status)
    } catch (e) {
      console.error('[tech] lifecycle notify failed', e)
    }
  }
  return { ok: true as const, ticket }
}
