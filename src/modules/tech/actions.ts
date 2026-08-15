'use server'

import { patchTechTicket } from '@/modules/tech/service'
import type { TicketStatus } from '@/modules/tickets/constants'

export async function techUpdateTicketAction(input: {
  ticketId: string
  techId: string
  status?: TicketStatus
  resolution_note?: string
  claim?: boolean
}) {
  const ticket = await patchTechTicket(input)
  return { ok: true as const, ticket }
}
