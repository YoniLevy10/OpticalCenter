import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DEMO_EMAIL = 'demo.tech@maintainos.local'
const DEMO_NAME = 'טכנאי דמו'

/**
 * Upserts a demo internal technician via Auth Admin so profiles.id FK is satisfied.
 * POST /api/demo/seed-tech → { techId } for DEMO_TECH_ID / ?techId=
 */
export async function POST(request: Request) {
  let email = DEMO_EMAIL
  let fullName = DEMO_NAME
  let password = `DemoTech-${crypto.randomUUID().slice(0, 8)}!`

  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      fullName?: string
      password?: string
    }
    if (body.email?.trim()) email = body.email.trim().toLowerCase()
    if (body.fullName?.trim()) fullName = body.fullName.trim()
    if (body.password?.trim()) password = body.password.trim()
  } catch {
    // empty body ok
  }

  try {
    const supabase = createAdminClient()

    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    if (listError) {
      return NextResponse.json(
        {
          error: listError.message,
          hint: 'נדרש SUPABASE_SERVICE_ROLE_KEY',
          workaround:
            'profiles.id → auth.users. בלי service role: claim עם actor_id=null ו-tech_id ב-payload.',
        },
        { status: 500 },
      )
    }

    let userId = listed.users.find((u) => u.email?.toLowerCase() === email)?.id

    if (!userId) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'internal_technician' },
      })
      if (createError || !created.user) {
        return NextResponse.json(
          {
            error: createError?.message ?? 'יצירת משתמש נכשלה',
            workaround: 'assigned_to nullable + tech_id ב-ticket_events אם FK חוסם.',
          },
          { status: 500 },
        )
      }
      userId = created.user.id
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      { id: userId, full_name: fullName, email, locale: 'he' },
      { onConflict: 'id' },
    )
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message, techId: userId },
        { status: 500 },
      )
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'optical-center')
      .maybeSingle()

    let organizationId = org?.id as string | undefined
    if (!organizationId) {
      const { data: anyOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle()
      organizationId = anyOrg?.id
    }

    if (organizationId) {
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('profile_id', userId)
        .eq('organization_id', organizationId)
        .eq('role', 'internal_technician')
        .maybeSingle()

      if (!existingMembership) {
        const { data: country } = await supabase
          .from('countries')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('code', 'IL')
          .maybeSingle()

        await supabase.from('memberships').insert({
          profile_id: userId,
          organization_id: organizationId,
          role: 'internal_technician',
          country_id: country?.id ?? null,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      techId: userId,
      email,
      fullName,
      organizationId: organizationId ?? null,
      next: `DEMO_TECH_ID=${userId} · /tech?techId=${userId}`,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return NextResponse.json(
      {
        error: message,
        workaround: 'profiles.id → auth.users; חלופה: assigned_to null + tech_id באירועים.',
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/demo/seed-tech',
    body: { email: 'optional', fullName: 'optional', password: 'optional' },
  })
}
