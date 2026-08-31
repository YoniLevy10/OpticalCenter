import type { MemberRole } from '@/lib/auth/types'

/**
 * Product roles for Optical Center (pilot).
 *
 * The DB still has the legacy 8-value `member_role` enum for backward
 * compatibility. New assignments and the Users UI only use these four.
 * Older roles keep working but map into the same capability buckets.
 */

export type ProductRole =
  | 'global_admin'
  | 'global_maintenance'
  | 'store_employee'
  | 'internal_technician'

export const PRODUCT_ROLES: readonly ProductRole[] = [
  'global_admin',
  'global_maintenance',
  'store_employee',
  'internal_technician',
] as const

export const PRODUCT_ROLE_LABELS_HE: Record<ProductRole, string> = {
  global_admin: 'מנהל מערכת',
  global_maintenance: 'תפעול',
  store_employee: 'חנות',
  internal_technician: 'טכנאי',
}

/** Short “who can what” for the Users admin. */
export const PRODUCT_ROLE_HELP_HE: Record<ProductRole, string> = {
  global_admin: 'הכל: משתמשים, הגדרות, תפעול, חנויות',
  global_maintenance: 'מרכז שליטה: תקלות, חנויות, דוחות — בלי ניהול משתמשים',
  store_employee: 'פורטל חנות בלבד — דיווח ומעקב',
  internal_technician: 'פורטל טכנאי — עבודות ששויכו אליו',
}

export const PRODUCT_ROLE_OPTIONS: {
  value: ProductRole
  label: string
}[] = PRODUCT_ROLES.map((value) => ({
  value,
  label: PRODUCT_ROLE_LABELS_HE[value],
}))

export function isProductRole(role: string): role is ProductRole {
  return (PRODUCT_ROLES as readonly string[]).includes(role)
}

export function isAssignableRole(role: MemberRole): role is ProductRole {
  return isProductRole(role)
}

/** Display label for any DB role (legacy → nearest product label). */
export function roleLabelHe(role: MemberRole | string): string {
  switch (role) {
    case 'global_admin':
      return PRODUCT_ROLE_LABELS_HE.global_admin
    case 'global_maintenance':
    case 'country_manager':
    case 'regional_manager':
      return role === 'global_maintenance'
        ? PRODUCT_ROLE_LABELS_HE.global_maintenance
        : `${PRODUCT_ROLE_LABELS_HE.global_maintenance} (ישן)`
    case 'store_employee':
    case 'store_manager':
      return role === 'store_employee'
        ? PRODUCT_ROLE_LABELS_HE.store_employee
        : `${PRODUCT_ROLE_LABELS_HE.store_employee} (ישן)`
    case 'internal_technician':
    case 'external_provider':
      return role === 'internal_technician'
        ? PRODUCT_ROLE_LABELS_HE.internal_technician
        : `${PRODUCT_ROLE_LABELS_HE.internal_technician} (ישן)`
    default:
      return role
  }
}

/** HQ portal: admins + ops. Store managers are store-portal only. */
export function hqProductRoles(): MemberRole[] {
  return [
    'global_admin',
    'global_maintenance',
    'country_manager',
    'regional_manager',
  ]
}

export function storeProductRoles(): MemberRole[] {
  return ['store_employee', 'store_manager']
}

export function techProductRoles(): MemberRole[] {
  return ['internal_technician', 'external_provider']
}

export function canManageUsersRole(role: MemberRole): boolean {
  return role === 'global_admin'
}
