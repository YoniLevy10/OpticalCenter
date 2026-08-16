import type { MemberRole } from '@/lib/auth/types'

/**
 * Known pilot / demo owners — email is the source of truth for Magic Link login.
 * Profile id is stable so memory mode and seeded Auth users stay aligned.
 */
export type PilotUser = {
  id: string
  /** Normalized lowercase email for matching */
  email: string
  /** Display form (as the user typed it) */
  displayEmail: string
  fullName: string
  role: MemberRole
}

export const PILOT_OWNER: PilotUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'opsbrain1@gmail.com',
  displayEmail: 'OpsBrain1@gmail.com',
  fullName: 'Ops Brain',
  role: 'global_admin',
}

export const PILOT_USERS: readonly PilotUser[] = [PILOT_OWNER]

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function findPilotUserByEmail(email: string | null | undefined): PilotUser | null {
  if (!email) return null
  const key = normalizeEmail(email)
  return PILOT_USERS.find((u) => u.email === key) ?? null
}

export function isPilotEmail(email: string | null | undefined): boolean {
  return findPilotUserByEmail(email) != null
}
