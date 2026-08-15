export type TicketSource = 'whatsapp' | 'qr_whatsapp' | 'nfc_whatsapp' | 'web_fallback' | 'demo'

export type IntakeState = 'awaiting_store' | 'awaiting_description' | 'done'

export type InboundMessage = {
  messageId: string
  waId: string
  phoneNumberId: string | null
  text: string | null
  mediaUrl: string | null
  mediaKind: 'image' | 'document' | null
  timestamp: string | null
  /** Optional override (simulator / deep-link hint). */
  sourceHint?: TicketSource | null
}

export type IntakeResult = {
  ok: boolean
  duplicate?: boolean
  reply: string | null
  ticketId?: string | null
  displayNumber?: string | null
  state?: IntakeState
  error?: string
}
