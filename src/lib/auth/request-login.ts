import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicAppUrl } from '@/lib/auth/app-url'
import { normalizeEmail } from '@/lib/auth/pilot-users'

export type RequestLoginResult = {
  ok: true
  email: string
  delivery: 'email_provider' | 'supabase_mail' | 'none'
  deliveryDetail?: string
}

/**
 * Start passwordless login.
 *
 * Prefer Resend with a production token_hash Magic Link (bypasses broken
 * Supabase Site URL → localhost). Fall back to Supabase mailer + OTP entry.
 */
export async function requestPasswordlessLogin(
  emailRaw: string,
  request?: Request,
): Promise<RequestLoginResult> {
  const email = normalizeEmail(emailRaw)
  const admin = createAdminClient()
  const appUrl = getPublicAppUrl(request)
  const redirectTo = `${appUrl}/auth/callback`

  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (resendKey) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (error || !data.properties?.hashed_token) {
      throw new Error(error?.message || 'יצירת קישור התחברות נכשלה')
    }

    const magicUrl = `${appUrl}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`
    const emailed = await sendResendLoginEmail({
      apiKey: resendKey,
      to: email,
      magicUrl,
      emailOtp: data.properties.email_otp,
    })
    if (!emailed.ok) {
      throw new Error(emailed.detail || 'שליחת מייל נכשלה')
    }
    return {
      ok: true,
      email,
      delivery: 'email_provider',
      deliveryDetail: 'resend',
    }
  }

  // No Resend: use Supabase mailer. Link may still redirect to Site URL
  // (localhost if misconfigured) — login UI accepts OTP + password as fallback.
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (otpError) {
    return {
      ok: true,
      email,
      delivery: 'none',
      deliveryDetail: otpError.message,
    }
  }

  return {
    ok: true,
    email,
    delivery: 'supabase_mail',
    deliveryDetail:
      'נשלח מייל מ־Supabase. אם הקישור נפתח ב־localhost — הזינו קוד מהמייל או התחברו עם סיסמה.',
  }
}

async function sendResendLoginEmail(input: {
  apiKey: string
  to: string
  magicUrl: string
  emailOtp: string
}): Promise<{ ok: boolean; detail: string }> {
  const from =
    process.env.LOGIN_EMAIL_FROM?.trim() || 'MaintainOS <onboarding@resend.dev>'

  const html = `
    <div dir="rtl" style="font-family:sans-serif;line-height:1.5">
      <h2>התחברות ל־MaintainOS</h2>
      <p>לחצו להתחברות (קישור חד־פעמי לשרת הפרודקשן):</p>
      <p><a href="${input.magicUrl}">כניסה למערכת</a></p>
      <p>או הזינו את הקוד במסך ההתחברות: <strong dir="ltr">${input.emailOtp}</strong></p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: 'התחברות ל־MaintainOS',
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { ok: false, detail: `resend_${res.status}:${body.slice(0, 160)}` }
  }
  return { ok: true, detail: 'resend' }
}
