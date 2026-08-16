#!/usr/bin/env node
/**
 * Seed OpsBrain1 (or another known pilot) into Auth + profiles + memberships.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-pilot-user.mjs
 *   node --env-file=.env.local scripts/seed-pilot-user.mjs OpsBrain1@gmail.com
 */
import { createClient } from '@supabase/supabase-js'

const PILOT = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'opsbrain1@gmail.com',
  displayEmail: 'OpsBrain1@gmail.com',
  fullName: 'Ops Brain',
  role: 'global_admin',
}

const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111'

async function main() {
  const argEmail = (process.argv[2] || PILOT.email).trim().toLowerCase()
  if (argEmail !== PILOT.email) {
    console.error('Only configured pilot emails are supported:', PILOT.displayEmail)
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) throw listError

  let userId = listed.users.find((u) => u.email?.toLowerCase() === PILOT.email)?.id
  let createdAuthUser = false

  if (!userId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      id: PILOT.id,
      email: PILOT.email,
      email_confirm: true,
      user_metadata: {
        full_name: PILOT.fullName,
        role: PILOT.role,
        pilot: true,
      },
    })
    if (createError || !created.user) {
      const { data: retry, error: retryError } = await supabase.auth.admin.createUser({
        email: PILOT.email,
        email_confirm: true,
        user_metadata: {
          full_name: PILOT.fullName,
          role: PILOT.role,
          pilot: true,
        },
      })
      if (retryError || !retry.user) {
        throw createError || retryError || new Error('createUser failed')
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
        full_name: PILOT.fullName,
        role: PILOT.role,
        pilot: true,
      },
    })
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: PILOT.email,
      full_name: PILOT.fullName,
      locale: 'he',
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', DEFAULT_ORG_ID)
    .maybeSingle()
  const organizationId = org?.id ?? DEFAULT_ORG_ID

  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', userId)
    .eq('organization_id', organizationId)
    .eq('role', PILOT.role)
    .maybeSingle()

  let createdMembership = false
  if (!existingMembership) {
    const { error: memError } = await supabase.from('memberships').insert({
      profile_id: userId,
      organization_id: organizationId,
      role: PILOT.role,
    })
    if (memError) throw memError
    createdMembership = true
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId,
        email: PILOT.displayEmail,
        role: PILOT.role,
        createdAuthUser,
        createdMembership,
        login: 'Magic Link from /login with OpsBrain1@gmail.com',
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
