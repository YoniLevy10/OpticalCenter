import type { InboundMessage, TicketSource } from './types'

type MetaWebhookBody = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        messaging_product?: string
        metadata?: { display_phone_number?: string; phone_number_id?: string }
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
        messages?: Array<{
          id?: string
          from?: string
          timestamp?: string
          type?: string
          text?: { body?: string }
          image?: { id?: string; caption?: string; mime_type?: string }
          document?: { id?: string; caption?: string; filename?: string }
          video?: { id?: string; caption?: string; mime_type?: string }
        }>
      }
    }>
  }>
}

/** Extract inbound WhatsApp Cloud API messages (text / image / document). */
export function parseWhatsAppWebhook(body: unknown): InboundMessage[] {
  const payload = body as MetaWebhookBody
  if (!payload || payload.object !== 'whatsapp_business_account') return []

  const out: InboundMessage[] = []
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages?.length) continue
      const phoneNumberId = value.metadata?.phone_number_id ?? null
      for (const msg of value.messages) {
        if (!msg.id || !msg.from) continue
        const type = msg.type ?? 'text'
        let text: string | null = null
        let mediaUrl: string | null = null
        let mediaKind: InboundMessage['mediaKind'] = null

        if (type === 'text') {
          text = msg.text?.body?.trim() || null
        } else if (type === 'image') {
          text = msg.image?.caption?.trim() || null
          mediaUrl = msg.image?.id ? `meta-media:${msg.image.id}` : null
          mediaKind = 'image'
        } else if (type === 'document') {
          text = msg.document?.caption?.trim() || null
          mediaUrl = msg.document?.id ? `meta-media:${msg.document.id}` : null
          mediaKind = 'document'
        } else if (type === 'video') {
          text = msg.video?.caption?.trim() || null
          mediaUrl = msg.video?.id ? `meta-media:${msg.video.id}` : null
          mediaKind = 'video'
        } else {
          continue
        }

        out.push({
          messageId: msg.id,
          waId: msg.from,
          phoneNumberId,
          text,
          mediaUrl,
          mediaKind,
          timestamp: msg.timestamp ?? null,
        })
      }
    }
  }
  return out
}

export function inferSourceFromText(
  text: string | null,
  hint?: TicketSource | null,
): TicketSource {
  if (hint === 'qr_whatsapp' || hint === 'nfc_whatsapp' || hint === 'whatsapp') {
    return hint
  }
  if (hint === 'demo') return 'demo'
  if (!text) return 'whatsapp'
  const upper = text.trim().toUpperCase()
  if (/\bSTORE[_\s-]?\d{1,6}\b/.test(upper)) return 'qr_whatsapp'
  return 'whatsapp'
}
