import { fetchTicketAttachments } from '@/modules/tickets/attachments'
import type { MemberRole } from '@/lib/auth/types'

const MEDIA_PROOF_KINDS = new Set(['image', 'video', 'before', 'after'])
export type ProofRole = 'before' | 'after'

export function isProofAttachmentKind(kind: string | null | undefined): boolean {
  if (!kind) return false
  return MEDIA_PROOF_KINDS.has(kind)
}

export function isProofRole(role: string | null | undefined): role is ProofRole {
  return role === 'before' || role === 'after'
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

export type ProofPairStatus = {
  hasProof: boolean
  hasBefore: boolean
  hasAfter: boolean
  complete: boolean
}

function roleFromAttachment(a: {
  kind?: string | null
  proof_role?: string | null
}): ProofRole | null {
  if (isProofRole(a.proof_role)) return a.proof_role
  if (a.kind === 'before' || a.kind === 'after') return a.kind
  return null
}

export function proofPairFromAttachments(
  attachments: { kind?: string | null; proof_role?: string | null }[],
): ProofPairStatus {
  let hasBefore = false
  let hasAfter = false
  let hasProof = false
  for (const a of attachments) {
    if (!isProofAttachmentKind(a.kind) && !isProofRole(a.proof_role)) continue
    hasProof = true
    const role = roleFromAttachment(a)
    if (role === 'before') hasBefore = true
    if (role === 'after') hasAfter = true
  }
  return {
    hasProof,
    hasBefore,
    hasAfter,
    complete: hasBefore && hasAfter,
  }
}

export async function ticketHasResolveProof(ticketId: string): Promise<boolean> {
  const attachments = await fetchTicketAttachments(ticketId)
  return proofPairFromAttachments(attachments).complete
}

export async function ticketProofPairStatus(
  ticketId: string,
): Promise<ProofPairStatus> {
  const attachments = await fetchTicketAttachments(ticketId)
  return proofPairFromAttachments(attachments)
}

/** Memory-backend proof: media messages tagged with proof_role before+after. */
export function memoryTicketHasResolveProof(
  messages: {
    media_url?: string | null
    channel?: string | null
    proof_role?: string | null
    body?: string | null
  }[],
): boolean {
  return memoryProofPairStatus(messages).complete
}

export function memoryProofPairStatus(
  messages: {
    media_url?: string | null
    channel?: string | null
    proof_role?: string | null
    body?: string | null
  }[],
): ProofPairStatus {
  let hasBefore = false
  let hasAfter = false
  let hasProof = false
  for (const m of messages) {
    const url = m.media_url?.trim()
    if (!url) continue
    if (url.startsWith('meta-media:')) continue
    if (/\.(ogg|mp3|wav|m4a)(\?|$)/i.test(url) || url.includes('audio/')) {
      continue
    }
    hasProof = true
    const role =
      (isProofRole(m.proof_role) ? m.proof_role : null) ||
      (m.body === 'before' || m.body === 'after' ? m.body : null)
    if (role === 'before') hasBefore = true
    if (role === 'after') hasAfter = true
  }
  // Legacy single-proof: any media counts as incomplete pair (needs both roles).
  return {
    hasProof,
    hasBefore,
    hasAfter,
    complete: hasBefore && hasAfter,
  }
}

export const RESOLVE_PROOF_REQUIRED_HE =
  'סגירה דורשת תמונות לפני ואחרי כהוכחת ביצוע'

export const RESOLVE_OVERRIDE_REASON_REQUIRED_HE =
  'נדרשת סיבת חריגה לסגירה ללא הוכחה'
