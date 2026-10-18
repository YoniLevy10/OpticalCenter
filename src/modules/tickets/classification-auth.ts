import type { Actor } from '@/lib/auth/types'
import { actorHasHqAccess } from '@/lib/auth/types'

/**
 * HQ (or demo without actor) may correct classification.
 * Server-only — do not import from client components (pulls node:crypto).
 */
export function canCorrectTicketClassification(
  actor: Actor | null,
  demoAllowed = false,
): boolean {
  if (actor && actorHasHqAccess(actor)) return true
  if (!actor && demoAllowed) return true
  return false
}
