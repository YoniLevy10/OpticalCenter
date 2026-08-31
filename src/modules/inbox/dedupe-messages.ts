export type ThreadMessageLike = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  ticket_id?: string | null
}

/** Collapse near-identical bubbles (same direction+body within a short window). */
export const THREAD_DEDUPE_WINDOW_MS = 15_000

/**
 * Inbox merges `inbox_messages` + `ticket_messages`. Ops replies are written to
 * both, so without this the UI shows one send as two bubbles ~1s apart.
 */
export function dedupeThreadMessages<T extends ThreadMessageLike>(
  messages: T[],
  windowMs: number = THREAD_DEDUPE_WINDOW_MS,
): T[] {
  const kept: T[] = []
  for (const message of messages) {
    const body = message.body.trim()
    const at = Date.parse(message.created_at)
    const duplicate = kept.some((prev) => {
      if (prev.direction !== message.direction) return false
      if (prev.body.trim() !== body) return false
      if (prev.id === message.id) return true
      const prevAt = Date.parse(prev.created_at)
      if (!Number.isFinite(at) || !Number.isFinite(prevAt)) return false
      return Math.abs(at - prevAt) <= windowMs
    })
    if (!duplicate) kept.push(message)
  }
  return kept
}
