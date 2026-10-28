export type ProofAttachment = {
  url?: string | null
  kind?: string | null
}

const INTAKE_KINDS = new Set(['image', 'video', 'proof_before'])

/**
 * A store photo already on the ticket counts as the before image.
 * An after photo does not. Undownloaded Meta placeholders do not either.
 */
export function hasBeforeEvidence(
  attachments: ProofAttachment[],
  messages: ProofAttachment[] = [],
): boolean {
  const counts = (row: ProofAttachment) => {
    const url = row.url?.trim()
    if (!url || url.startsWith('meta-media:')) return false
    if (row.kind === 'proof_after' || row.kind === 'document') return false
    if (!row.kind || INTAKE_KINDS.has(row.kind)) return true
    return false
  }
  return attachments.some(counts) || messages.some((row) => counts({ ...row, url: row.url }))
}

/**
 * Resolve requires a note, an after photo, and a before photo
 * unless the store already sent one.
 */
export function resolveProofError(input: {
  note?: string | null
  afterPhotoUrl?: string | null
  beforePhotoUrl?: string | null
  hasIntakePhoto: boolean
}): string | null {
  if (!input.note?.trim()) return 'נדרשת הערת סיום'
  if (!input.afterPhotoUrl?.trim()) return 'נדרשת תמונת אחרי'
  const hasBefore = input.hasIntakePhoto || Boolean(input.beforePhotoUrl?.trim())
  if (!hasBefore) return 'נדרשת תמונת לפני'
  return null
}
