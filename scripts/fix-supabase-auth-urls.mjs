#!/usr/bin/env node
/**
 * Fix Supabase Auth Site URL + redirect allow list (requires personal access token).
 *
 *   export SUPABASE_ACCESS_TOKEN=sbp_...
 *   node --env-file=.env.local scripts/fix-supabase-auth-urls.mjs
 *
 * Create token: https://supabase.com/dashboard/account/tokens
 */
const PROJECT_REF = 'pfsxuylbnpbcgjehuaqo'
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://optical-center-rose.vercel.app'

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
  if (!token) {
    console.error(`
Missing SUPABASE_ACCESS_TOKEN.

1) Open https://supabase.com/dashboard/account/tokens and create a token
2) Or fix manually:
   https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration
   Site URL = ${SITE_URL}
   Redirect URLs =
     ${SITE_URL}/**
     ${SITE_URL}/auth/callback
     http://localhost:3000/**
     http://localhost:3000/auth/callback
`)
    process.exit(1)
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: SITE_URL,
        uri_allow_list: [
          `${SITE_URL}/**`,
          `${SITE_URL}/auth/callback`,
          'http://localhost:3000/**',
          'http://localhost:3000/auth/callback',
        ].join(','),
      }),
    },
  )
  const text = await res.text()
  if (!res.ok) {
    console.error('Failed', res.status, text)
    process.exit(1)
  }
  console.log('Updated Auth URL config →', SITE_URL)
  console.log(text.slice(0, 500))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
