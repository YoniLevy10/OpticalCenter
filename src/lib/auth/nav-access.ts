import type { Actor, MemberRole } from '@/lib/auth/types'

export type NavTool = {
  id: string
  href: string
  label: string
}

const HQ_ROLES: MemberRole[] = [
  'global_admin',
  'global_maintenance',
  'country_manager',
  'regional_manager',
  'store_manager',
]

const TECH_ROLES: MemberRole[] = ['internal_technician', 'external_provider']

function hasHq(actor: Actor): boolean {
  return actor.memberships.some((m) => HQ_ROLES.includes(m.role))
}

function hasTech(actor: Actor): boolean {
  return actor.memberships.some((m) => TECH_ROLES.includes(m.role))
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_MAINTAINOS_FORCE_MEMORY !== '1' &&
    process.env.MAINTAINOS_FORCE_MEMORY !== '1'
  )
}

export const ALL_NAV_TOOLS: NavTool[] = [
  { id: 'inbox', href: '/ops/inbox', label: 'תיבת WhatsApp' },
  { id: 'assets', href: '/ops/assets', label: 'נכסים' },
  { id: 'vendors', href: '/ops/vendors', label: 'ספקים' },
  { id: 'activity', href: '/ops/activity', label: 'יומן פעילות' },
  { id: 'reports', href: '/ops/reports', label: 'דוחות' },
  { id: 'status', href: '/ops/status', label: 'סטטוס מערכת' },
  { id: 'settings', href: '/ops/settings', label: 'הגדרות' },
  { id: 'users', href: '/ops/users', label: 'משתמשים' },
  { id: 'print-qr', href: '/ops/stores/print-qr', label: 'הדפסת QR' },
  { id: 'simulator', href: '/ops/simulator', label: 'סימולטור WhatsApp' },
  { id: 'tech', href: '/tech', label: 'פורטל טכנאי' },
]

export function canAccessUsers(actor: Actor | null): boolean {
  if (!actor) return false
  return actor.memberships.some(
    (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
  )
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

export function canAccessSimulator(actor: Actor | null): boolean {
  if (isProductionRuntime()) return false
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessInbox(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessActivity(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessStatus(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessPrintQr(actor: Actor | null): boolean {
  if (!actor) return true
  return hasHq(actor)
}

export function canAccessTechPortal(actor: Actor | null): boolean {
  if (!actor) return true
  return hasTech(actor) || hasHq(actor)
}

const ACCESS: Record<string, (actor: Actor | null) => boolean> = {
  inbox: canAccessInbox,
  assets: canAccessAssets,
  vendors: canAccessVendors,
  activity: canAccessActivity,
  reports: canAccessReports,
  status: canAccessStatus,
  settings: canAccessSettings,
  users: canAccessUsers,
  'print-qr': canAccessPrintQr,
  simulator: canAccessSimulator,
  tech: canAccessTechPortal,
}

/** Filter secondary nav tools by actor role. Demo mode shows all non-prod tools. */
export function resolveNavTools(actor: Actor | null): NavTool[] {
  return ALL_NAV_TOOLS.filter((tool) => {
    const check = ACCESS[tool.id]
    return check ? check(actor) : true
  })
}
