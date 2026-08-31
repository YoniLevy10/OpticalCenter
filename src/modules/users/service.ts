import { createSystemClient } from '@/lib/supabase/system'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  memAddMembership,
  memListUsers,
  memUpdateMembership,
  memUpsertProfile,
  type MemUserRow,
} from '@/lib/auth/memory-memberships'
import type { MemberRole, Membership } from '@/lib/auth/types'
import { AuthError, type Actor } from '@/lib/auth/types'
import { isAssignableRole } from '@/lib/auth/roles'
import { MEM_COUNTRY_ID, MEM_ORG_ID, supabaseReady } from '@/lib/data/memory-store'
import { sanitizePhoneInput } from '@/lib/phone'

export type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  memberships: Membership[]
}

export function requireUsersAdmin(actor: Actor) {
  const ok = actor.memberships.some((m) => m.role === 'global_admin')
  if (!ok) {
    throw new AuthError('אין הרשאת ניהול משתמשים', 403)
  }
}

export async function listUsers(): Promise<UserRow[]> {
  if (!(await supabaseReady())) {
    return memListUsers().map(toUserRow)
  }

  const supabase = createSystemClient('users_list')
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone')
    .order('full_name', { ascending: true })
  if (error) throw new Error(error.message)

  const ids = (profiles ?? []).map((p) => p.id)
  if (ids.length === 0) return []

  const { data: memberships, error: mErr } = await supabase
    .from('memberships')
    .select(
      'id, profile_id, organization_id, role, country_id, region_id, store_id',
    )
    .in('profile_id', ids)
  if (mErr) throw new Error(mErr.message)

  const byProfile = new Map<string, Membership[]>()
  for (const m of (memberships ?? []) as Membership[]) {
    const list = byProfile.get(m.profile_id) ?? []
    list.push(m)
    byProfile.set(m.profile_id, list)
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    phone: (p as { phone?: string | null }).phone ?? null,
    memberships: byProfile.get(p.id) ?? [],
  }))
}

export type CreateUserInput = {
  full_name: string
  email: string
  role: MemberRole
  phone?: string | null
  country_id?: string | null
  region_id?: string | null
  store_id?: string | null
  organization_id?: string | null
  /** Optional explicit profile id (defaults to new uuid). */
  id?: string
  /** When set, also creates a Supabase Auth user that can log in with password. */
  password?: string
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  if (!isAssignableRole(input.role)) {
    throw new Error('תפקיד לא נתמך — בחרו מנהל מערכת, תפעול, חנות או טכנאי')
  }

  let id = input.id ?? crypto.randomUUID()
  const orgId = input.organization_id ?? MEM_ORG_ID
  const countryId =
    input.country_id === undefined
      ? techDefaultCountry(input.role)
      : input.country_id
  const email = input.email.trim().toLowerCase()
  const password = input.password?.trim() || null
  const phone = sanitizePhoneInput(input.phone)

  if (!(await supabaseReady())) {
    memUpsertProfile({
      id,
      email,
      full_name: input.full_name,
      phone,
    })
    memAddMembership(id, input.role, {
      organization_id: orgId,
      country_id: countryId,
      region_id: input.region_id ?? null,
      store_id: input.store_id ?? null,
    })
    const row = memListUsers().find((u) => u.id === id)
    return toUserRow(row!)
  }

  // Prefer Auth user id so Google/password sessions match the profile row.
  if (password) {
    const admin = createAdminClient()
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    })
    if (authErr || !created.user) {
      throw new Error(authErr?.message || 'יצירת חשבון התחברות נכשלה')
    }
    id = created.user.id
  }

  const supabase = createSystemClient('users_create')
  const { error: pErr } = await supabase.from('profiles').upsert({
    id,
    email,
    full_name: input.full_name,
    phone,
    locale: 'he',
  })
  if (pErr) throw new Error(pErr.message)

  const { data: membership, error: mErr } = await supabase
    .from('memberships')
    .insert({
      profile_id: id,
      organization_id: orgId,
      role: input.role,
      country_id: countryId,
      region_id: input.region_id ?? null,
      store_id: input.store_id ?? null,
    })
    .select(
      'id, profile_id, organization_id, role, country_id, region_id, store_id',
    )
    .single()
  if (mErr) throw new Error(mErr.message)

  return {
    id,
    email,
    full_name: input.full_name,
    phone,
    memberships: [membership as Membership],
  }
}

export type PatchUserInput = {
  full_name?: string
  email?: string
  phone?: string | null
  membership_id?: string
  role?: MemberRole
  country_id?: string | null
  region_id?: string | null
  store_id?: string | null
}

export async function patchUser(
  profileId: string,
  input: PatchUserInput,
): Promise<UserRow> {
  if (!(await supabaseReady())) {
    const existing = memListUsers().find((u) => u.id === profileId)
    if (!existing) throw new Error('משתמש לא נמצא')
    if (
      input.full_name !== undefined ||
      input.email !== undefined ||
      input.phone !== undefined
    ) {
      memUpsertProfile({
        id: profileId,
        full_name:
          input.full_name !== undefined
            ? input.full_name
            : existing.full_name,
        email: input.email !== undefined ? input.email : existing.email,
        phone:
          input.phone !== undefined
            ? sanitizePhoneInput(input.phone)
            : existing.phone ?? null,
      })
    }
    if (input.membership_id && input.role) {
      const updated = memUpdateMembership(input.membership_id, {
        role: input.role,
        country_id: input.country_id,
        region_id: input.region_id,
        store_id: input.store_id,
      })
      if (!updated) throw new Error('חברות לא נמצאה')
    } else if (input.role && !input.membership_id) {
      const primary = existing.memberships[0]
      if (primary) {
        memUpdateMembership(primary.id, {
          role: input.role,
          country_id: input.country_id,
          region_id: input.region_id,
          store_id: input.store_id,
        })
      } else {
        memAddMembership(profileId, input.role, {
          country_id: input.country_id ?? techDefaultCountry(input.role),
          region_id: input.region_id ?? null,
          store_id: input.store_id ?? null,
        })
      }
    }
    const row = memListUsers().find((u) => u.id === profileId)
    return toUserRow(row!)
  }

  const supabase = createSystemClient('users_patch')
  if (
    input.full_name !== undefined ||
    input.email !== undefined ||
    input.phone !== undefined
  ) {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...(input.full_name !== undefined
          ? { full_name: input.full_name }
          : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined
          ? { phone: sanitizePhoneInput(input.phone) }
          : {}),
      })
      .eq('id', profileId)
    if (error) throw new Error(error.message)
  }

  if (input.role) {
    let membershipId = input.membership_id
    if (!membershipId) {
      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('profile_id', profileId)
        .limit(1)
        .maybeSingle()
      membershipId = existing?.id
    }
    if (membershipId) {
      const { error } = await supabase
        .from('memberships')
        .update({
          role: input.role,
          ...(input.country_id !== undefined
            ? { country_id: input.country_id }
            : {}),
          ...(input.region_id !== undefined
            ? { region_id: input.region_id }
            : {}),
          ...(input.store_id !== undefined ? { store_id: input.store_id } : {}),
        })
        .eq('id', membershipId)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('memberships').insert({
        profile_id: profileId,
        organization_id: MEM_ORG_ID,
        role: input.role,
        country_id: input.country_id ?? techDefaultCountry(input.role),
        region_id: input.region_id ?? null,
        store_id: input.store_id ?? null,
      })
      if (error) throw new Error(error.message)
    }
  }

  const users = await listUsers()
  const row = users.find((u) => u.id === profileId)
  if (!row) throw new Error('משתמש לא נמצא')
  return row
}

function techDefaultCountry(role: MemberRole): string | null {
  if (role === 'internal_technician' || role === 'external_provider') {
    return MEM_COUNTRY_ID
  }
  return null
}

function toUserRow(row: MemUserRow): UserRow {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone ?? null,
    memberships: row.memberships,
  }
}
