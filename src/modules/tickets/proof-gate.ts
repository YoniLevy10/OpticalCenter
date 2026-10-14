import { fetchTicketAttachments } from '@/modules/tickets/attachments'
import type { MemberRole } from '@/lib/auth/types'

const PROOF_KINDS = new Set(['image', 'video'])

export function isProofAttachmentKind(kind: string | null | undefined): boolean {
  if (!kind) return false
  return PROOF_KINDS.has(kind)
}

export function actorCanOverrideResolve(
  roles: Iterable<MemberRole | string> | null | undefined,
): boolean {
  if (!roles) return false
  for (const role of roles) {
    if (role === 'global_maintenance') return true
  }
  return false
}

export async function ticketHasResolveProof(ticketId: string): Promise<boolean> {
  const attachments = await fetchTicketAttachments(ticketId)
  return attachments.some((a) => isProofAttachmentKind(a.kind))
}

/** Memory-backend proof: any inbound tech/web media_url counts as image proof. */
export function memoryTicketHasResolveProof(
  messages: { media_url?: string | null; channel?: string | null }[],
): boolean {
  return messages.some((m) => {
    const url = m.media_url?.trim()
    if (!url) return false
    if (url.startsWith('meta-media:')) return false
    if (/\.(mp4|webm)(\?|$)/i.test(url) || url.includes('video/')) return true
    if (/\.(ogg|mp3|wav|m4a)(\?|$)/i.test(url) || url.includes('audio/')) {
      return false
    }
    return true
  })
}

export const RESOLVE_PROOF_REQUIRED_HE =
  'סגירה דורשת תמונה או וידאו כהוכחת ביצוע'

export const RESOLVE_OVERRIDE_REASON_REQUIRED_HE =
  'נדרשת סיבת חריגה לסגירה ללא הוכחה'
