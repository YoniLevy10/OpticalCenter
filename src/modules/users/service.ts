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

function hebrewAuthError(message: string): string {
  const m = message.toLowerCase()
  if (
    m.includes('already') ||
    m.includes('registered') ||
    m.includes('exists') ||
    m.includes('duplicate')
  ) {
    return 'המייל כבר רשום במערכת'
  }
  if (m.includes('password')) {
    return 'הסיסמה לא תקינה — לפחות 6 תווים'
  }
  if (m.includes('email') && (m.includes('invalid') || m.includes('validate'))) {
    return 'כתובת המייל לא תקינה'
  }
  if (
    m.includes('foreign key') ||
    m.includes('violates foreign key') ||
    m.includes('organization_id') ||
    m.includes('country_id') ||
    m.includes('store_id')
  ) {
    return 'שיוך מדינה/סניף לא תקין — בדקו את הבחירה ונסו שוב'
  }
  if (m.includes('service_role') || m.includes('missing next_public_supabase')) {
    return 'תקלת הגדרות שרת — חסר מפתח מנהל (Service Role)'
  }
  return message
}

function isDuplicateAuthError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already') ||
    m.includes('registered') ||
    m.includes('exists') ||
    m.includes('duplicate')
  )
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  // Paginate a bit — pilot orgs are small; avoid silent miss on page 1 only.
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw new Error(hebrewAuthError(error.message))
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
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

  if (input.role === 'internal_technician' && !phone) {
    throw new Error('לטכנאי חובה להזין מספר טלפון להודעות שיוך')
  }

  if (!(await supabaseReady())) {
    const existing = memListUsers().find(
      (u) => u.email?.toLowerCase() === email,
    )
    if (existing) {
      throw new Error('המייל כבר רשום במערכת')
    }
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

  const supabase = createSystemClient('users_create')

  // Prefer an existing profile with this email so we don't orphan Auth users.
  const { data: existingByEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()
  if (existingByEmail?.id) {
    id = existingByEmail.id
  }

  // Prefer Auth user id so Google/password sessions match the profile row.
  if (password) {
    let admin: ReturnType<typeof createAdminClient>
    try {
      admin = createAdminClient()
    } catch (err) {
      throw new Error(
        hebrewAuthError(err instanceof Error ? err.message : String(err)),
      )
    }

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
      ...(existingByEmail?.id ? { id: existingByEmail.id } : {}),
    })

    if (authErr || !created.user) {
      const raw = authErr?.message || 'יצירת חשבון התחברות נכשלה'
      if (!isDuplicateAuthError(raw)) {
        throw new Error(hebrewAuthError(raw))
      }
      // Email already in Auth — reuse that user and refresh password/profile.
      const existingId = await findAuthUserIdByEmail(admin, email)
      if (!existingId) {
        throw new Error('המייל כבר רשום במערכת')
      }
      id = existingId
      const { error: updErr } = await admin.auth.admin.updateUserById(id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: input.full_name },
      })
      if (updErr) throw new Error(hebrewAuthError(updErr.message))
    } else {
      id = created.user.id
    }
  }

  const { error: pErr } = await supabase.from('profiles').upsert(
    {
      id,
      email,
      full_name: input.full_name,
      phone,
      locale: 'he',
    },
    { onConflict: 'id' },
  )
  if (pErr) throw new Error(hebrewAuthError(pErr.message))

  // Reuse membership if the profile already has one; otherwise insert.
  const { data: existingMembership } = await supabase
    .from('memberships')
    .select(
      'id, profile_id, organization_id, role, country_id, region_id, store_id',
    )
    .eq('profile_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let membership = existingMembership as Membership | null
  if (membership) {
    const { data: updated, error: uErr } = await supabase
      .from('memberships')
      .update({
        role: input.role,
        country_id: countryId,
        region_id: input.region_id ?? null,
        store_id: input.store_id ?? null,
      })
      .eq('id', membership.id)
      .select(
        'id, profile_id, organization_id, role, country_id, region_id, store_id',
      )
      .single()
    if (uErr) throw new Error(hebrewAuthError(uErr.message))
    membership = updated as Membership
  } else {
    const { data: inserted, error: mErr } = await supabase
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
    if (mErr) throw new Error(hebrewAuthError(mErr.message))
    membership = inserted as Membership
  }

  return {
    id,
    email,
    full_name: input.full_name,
    phone,
    memberships: [membership],
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
