/**
 * Per-chat private ops window.
 * Bot stays on globally; only this wa_id is paused until `human_takeover_until`.
 * Keep this short — ops chats briefly; the bot must resume quickly.
 */
export const HUMAN_PAUSE_WINDOW_MS = 10 * 60 * 1000

/** Display helper for ops UI copy. */
export const HUMAN_PAUSE_WINDOW_MINUTES = HUMAN_PAUSE_WINDOW_MS / 60_000

export function humanPauseUntilIso(fromMs: number = Date.now()): string {
  return new Date(fromMs + HUMAN_PAUSE_WINDOW_MS).toISOString()
}

export function isHumanPauseActive(session: {
  human_takeover?: boolean | null
  human_takeover_until?: string | null
}): boolean {
  if (!session.human_takeover) return false
  const until = session.human_takeover_until
  // Legacy permanent flags (no until) must not mute the bot forever.
  if (!until) return false
  const ms = Date.parse(until)
  return Number.isFinite(ms) && ms > Date.now()
}

export function formatPauseUntilHe(untilIso: string | null | undefined): string | null {
  if (!untilIso) return null
  const ms = Date.parse(untilIso)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
