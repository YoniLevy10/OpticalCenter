import type { Actor, MemberRole } from '@/lib/auth/types'
import { canManageUsersRole, hqProductRoles } from '@/lib/auth/roles'

export type NavTool = {
  id: string
  href: string
  label: string
}

const HQ_ROLES: MemberRole[] = hqProductRoles()

function hasHq(actor: Actor): boolean {
  return actor.memberships.some((m) => HQ_ROLES.includes(m.role))
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_MAINTAINOS_FORCE_MEMORY !== '1' &&
    process.env.MAINTAINOS_FORCE_MEMORY !== '1'
  )
}

export const ALL_NAV_TOOLS: NavTool[] = [
  { id: 'assets', href: '/ops/assets', label: 'ציוד' },
  { id: 'vendors', href: '/ops/vendors', label: 'ספקים' },
  { id: 'activity', href: '/ops/activity', label: 'מה קרה במערכת' },
  { id: 'reports', href: '/ops/reports', label: 'דוחות' },
  { id: 'status', href: '/ops/status', label: 'בריאות המערכת' },
  { id: 'settings', href: '/ops/settings', label: 'הגדרות' },
  { id: 'users', href: '/ops/users', label: 'אנשים והרשאות' },
  { id: 'print-qr', href: '/ops/stores/print-qr', label: 'הדפסת QR לסניפים' },
  { id: 'lab', href: '/ops/lab', label: 'מעבדה' },
  { id: 'simulator', href: '/ops/simulator', label: 'סימולטור הודעות' },
]

export function canAccessUsers(actor: Actor | null): boolean {
  if (!actor) return false
  return actor.memberships.some((m) => canManageUsersRole(m.role))
}

export function canAccessVendors(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessAssets(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessReports(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessSettings(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessStatus(actor: Actor | null): boolean {
  return canAccessSettings(actor)
}

export function canAccessSimulator(actor: Actor | null): boolean {
  if (isProductionRuntime()) return false
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessLab(actor: Actor | null): boolean {
  return canAccessSimulator(actor)
}

export function canAccessInbox(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessActivity(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessPrintQr(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

const ACCESS: Record<string, (actor: Actor | null) => boolean> = {
  assets: canAccessAssets,
  vendors: canAccessVendors,
  activity: canAccessActivity,
  reports: canAccessReports,
  status: canAccessStatus,
  settings: canAccessSettings,
  users: canAccessUsers,
  'print-qr': canAccessPrintQr,
  lab: canAccessLab,
  simulator: canAccessSimulator,
}

/** Filter secondary nav tools by actor role. Demo mode shows all non-prod tools. */
export function resolveNavTools(actor: Actor | null): NavTool[] {
  return ALL_NAV_TOOLS.filter((tool) => {
    const check = ACCESS[tool.id]
    return check ? check(actor) : true
  })
}
