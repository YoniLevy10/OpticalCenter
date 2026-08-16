import { createAdminClient } from '@/lib/supabase/admin'
import {
  PILOT_OWNER,
  findPilotUserByEmail,
  normalizeEmail,
  type PilotUser,
} from '@/lib/auth/pilot-users'
import {
  memAddMembership,
  memGetProfile,
  memListMemberships,
  memUpsertProfile,
} from '@/lib/auth/memory-memberships'
import { MEM_ORG_ID, supabaseReady } from '@/lib/data/memory-store'
import type { MemberRole } from '@/lib/auth/types'

export type SeedPilotResult = {
  ok: true
  mode: 'memory' | 'supabase'
  userId: string
  email: string
  fullName: string
  role: MemberRole
  createdAuthUser: boolean
  createdMembership: boolean
}

const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111'

/**
 * Ensure a pilot/demo user exists as Auth user + profile + membership.
 * Works in memory mode and against live Supabase (service role).
 */
export async function seedPilotUser(
  pilot: PilotUser = PILOT_OWNER,
): Promise<SeedPilotResult> {
  if (!(await supabaseReady())) {
    memUpsertProfile({
      id: pilot.id,
      email: pilot.email,
      full_name: pilot.fullName,
      locale: 'he',
    })
    const existing = memListMemberships(pilot.id)
    let createdMembership = false
    if (!existing.some((m) => m.role === pilot.role)) {
      memAddMembership(pilot.id, pilot.role, {
        organization_id: MEM_ORG_ID,
      })
      createdMembership = true
    }
    return {
      ok: true,
      mode: 'memory',
      userId: pilot.id,
      email: pilot.email,
      fullName: pilot.fullName,
      role: pilot.role,
      createdAuthUser: false,
      createdMembership,
    }
  }

  const supabase = createAdminClient()
  const email = normalizeEmail(pilot.email)

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) throw new Error(listError.message)

  let userId = listed.users.find((u) => u.email?.toLowerCase() === email)?.id
  let createdAuthUser = false

  if (!userId) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        id: pilot.id,
        email,
        email_confirm: true,
        user_metadata: {
          full_name: pilot.fullName,
          role: pilot.role,
          pilot: true,
        },
      })
    if (createError || !created.user) {
      // Retry without fixed id if id collision (e.g. reused uuid elsewhere)
      const { data: retry, error: retryError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: pilot.fullName,
            role: pilot.role,
            pilot: true,
          },
        })
      if (retryError || !retry.user) {
        throw new Error(createError?.message ?? retryError?.message ?? 'createUser failed')
      }
      userId = retry.user.id
    } else {
      userId = created.user.id
    }
    createdAuthUser = true
  } else {
    await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: {
        full_name: pilot.fullName,
        role: pilot.role,
        pilot: true,
      },
    })
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: pilot.fullName,
      locale: 'he',
    },
    { onConflict: 'id' },
  )
  if (profileError) throw new Error(profileError.message)

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'optical-center')
    .maybeSingle()

  let organizationId = (org?.id as string | undefined) ?? DEFAULT_ORG_ID
  if (!org?.id) {
    const { data: anyOrg } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle()
    if (anyOrg?.id) organizationId = anyOrg.id
  }

  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', userId)
    .eq('organization_id', organizationId)
    .eq('role', pilot.role)
    .maybeSingle()

  let createdMembership = false
  if (!existingMembership) {
    const { error: memError } = await supabase.from('memberships').insert({
      profile_id: userId,
      organization_id: organizationId,
      role: pilot.role,
      country_id: null,
      region_id: null,
      store_id: null,
    })
    if (memError) throw new Error(memError.message)
    createdMembership = true
  }

  return {
    ok: true,
    mode: 'supabase',
    userId,
    email,
    fullName: pilot.fullName,
    role: pilot.role,
    createdAuthUser,
    createdMembership,
  }
}

/**
 * After Magic Link login: if email is a known pilot, ensure profile + role.
 * Uses the Auth user id (may differ from PILOT_OWNER.id if user was created via OTP).
 */
export async function ensurePilotAccessForAuthUser(input: {
  userId: string
  email: string | null | undefined
  fullName?: string | null
}): Promise<PilotUser | null> {
  const pilot = findPilotUserByEmail(input.email)
  if (!pilot) return null

  if (!(await supabaseReady())) {
    memUpsertProfile({
      id: input.userId,
      email: pilot.email,
      full_name: input.fullName ?? pilot.fullName,
      locale: 'he',
    })
    // Keep stable pilot id profile in sync for demo cookie path
    if (input.userId !== pilot.id && !memGetProfile(pilot.id)) {
      memUpsertProfile({
        id: pilot.id,
        email: pilot.email,
        full_name: pilot.fullName,
        locale: 'he',
      })
    }
    if (!memListMemberships(input.userId).some((m) => m.role === pilot.role)) {
      memAddMembership(input.userId, pilot.role, {
        organization_id: MEM_ORG_ID,
      })
    }
    return pilot
  }

  const supabase = createAdminClient()
  const email = normalizeEmail(pilot.email)

  await supabase.from('profiles').upsert(
    {
      id: input.userId,
      email,
      full_name: input.fullName ?? pilot.fullName,
      locale: 'he',
    },
    { onConflict: 'id' },
  )

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'optical-center')
    .maybeSingle()
  const organizationId = (org?.id as string | undefined) ?? DEFAULT_ORG_ID

  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', input.userId)
    .eq('organization_id', organizationId)
    .eq('role', pilot.role)
    .maybeSingle()

  if (!existingMembership) {
    await supabase.from('memberships').insert({
      profile_id: input.userId,
      organization_id: organizationId,
      role: pilot.role,
    })
  }

  return pilot
}
