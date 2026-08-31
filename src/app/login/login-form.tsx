'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageCircle, ShieldCheck, Wrench } from 'lucide-react'
import { SkipLink } from '@/components/layout/skip-link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/primitives'
import { LiveRegion } from '@/components/ui/a11y'
import { createClient } from '@/lib/supabase/client'

const PILOT_DEMO_EMAIL = 'OpsBrain1@gmail.com'

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (
    !raw.startsWith('/ops') &&
    !raw.startsWith('/tech') &&
    !raw.startsWith('/store') &&
    !raw.startsWith('/report')
  ) {
    return null
  }
  return raw
}

const VALUE_PROPS = [
  {
    icon: MessageCircle,
    title: 'דיווח מהשטח',
    desc: 'תקלות נכנסות מ-WhatsApp — בלי אפליקציה נוספת לחנויות.',
  },
  {
    icon: ShieldCheck,
    title: 'SLA בזמן אמת',
    desc: 'חריגות, שיוכים ועומס טכנאים — במקום אחד.',
  },
  {
    icon: Wrench,
    title: 'טכנאים במובייל',
    desc: 'פורטל שדה מותאם לעבודה בחנות, לא למשרד.',
  },
] as const

export function LoginForm({ demoEntry }: { demoEntry: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error') === 'auth'
  const unauthorized = searchParams.get('error') === 'unauthorized'
  const nextPath = safeNextPath(searchParams.get('next'))
  const googleOAuthReady =
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === '1'
  const [email, setEmail] = useState(PILOT_DEMO_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    unauthorized
      ? 'המייל אינו מאושר להתחברות. פנו למנהל המערכת.'
      : authError
        ? 'ההתחברות נכשלה — נסו Google או מייל וסיסמה שסופקו לכם'
        : null,
  )
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [showEmailBackup, setShowEmailBackup] = useState(!googleOAuthReady)

  async function signInGoogle() {
    setGoogleBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const next = searchParams.get('next') || '/ops/dashboard'
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google OAuth נכשל')
      setGoogleBusy(false)
    }
  }

  async function signInPassword(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/request-login?mode=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        home?: string
      }
      if (!res.ok) throw new Error(data.error || 'התחברות נכשלה')
      router.replace(nextPath ?? data.home ?? '/ops/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'התחברות נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function enterAsDemo() {
    setDemoBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/demo-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: PILOT_DEMO_EMAIL }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
      }
      if (!res.ok) throw new Error(data.error || 'כניסת דמו נכשלה')
      router.replace('/ops/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'כניסת דמו נכשלה')
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <div className="login-shell dvh-screen safe-pt safe-pb grid min-h-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <SkipLink />
      {/* Brand story — desktop hero */}
      <aside
        className="login-brand-panel relative hidden flex-col justify-between overflow-hidden p-8 md:flex md:p-10 lg:p-12"
        aria-label="MaintainOS"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-24 top-1/4 h-80 w-80 rounded-full bg-[var(--tenant)] opacity-[0.12] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-16 bottom-0 h-64 w-64 rounded-full bg-white opacity-30 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span
              className="t-display flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-pop)]"
              aria-hidden
            >
              M
            </span>
            <div>
              <p className="t-title text-ink">MaintainOS</p>
              <p className="t-caption text-ink-2">Optical Center</p>
            </div>
          </div>
          <h1 className="t-display mt-10 max-w-md text-ink">
            תחזוקה חכמה לרשתות קמעונאיות
          </h1>
          <p className="t-lead mt-3 max-w-md text-ink-2">
            מרכז פיקוד שקט — דיווחים מהשטח, SLA חי, וטכנאים שמסיימים עבודה מהנייד.
          </p>
        </div>

        <ul className="relative mt-10 space-y-4">
          {VALUE_PROPS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="flex gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white/80 text-[var(--tenant)] shadow-[var(--shadow-1)] ring-1 ring-[var(--tenant-line)]"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="t-body-strong text-ink">{item.title}</p>
                  <p className="t-meta mt-0.5 text-ink-2">{item.desc}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="relative t-caption text-ink-3">
          Optical Center · פיילוט ישראל
        </p>
      </aside>

      {/* Form column */}
      <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-col items-center justify-center px-4 py-8 outline-none md:px-10 lg:px-14">
        <div className="mb-8 text-center md:hidden">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-pop)]">
            <span className="t-display" aria-hidden>M</span>
          </div>
          <h1 className="t-title text-ink">MaintainOS</h1>
          <p className="t-body mt-1 text-ink-2">Optical Center</p>
          {!googleOAuthReady ? (
            <p className="t-caption mt-2 text-ink-3">מייל + סיסמה · {PILOT_DEMO_EMAIL}</p>
          ) : null}
        </div>

        <div className="w-full max-w-[400px] animate-scale-in">
          <div className="mb-6 hidden md:block">
            <h2 className="t-title text-ink">כניסה למערכת</h2>
            <p className="t-body mt-1 text-ink-2">
              {googleOAuthReady
                ? 'Gmail מאושר, או מייל וסיסמה שסופקו על ידי מנהל המערכת.'
                : 'מייל וסיסמה שסופקו על ידי מנהל המערכת.'}
            </p>
          </div>

          <div
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-pop)]"
          >
            {googleOAuthReady ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="block"
                  disabled={googleBusy}
                  onClick={() => void signInGoogle()}
                  className="mb-4"
                >
                  {googleBusy ? 'מעביר…' : 'המשך עם Google'}
                </Button>

                <button
                  type="button"
                  className="t-caption mb-4 w-full text-center text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline"
                  onClick={() => setShowEmailBackup((v) => !v)}
                >
                  {showEmailBackup
                    ? 'הסתר התחברות בסיסמה'
                    : 'התחברות עם מייל וסיסמה'}
                </button>
              </>
            ) : null}

            {showEmailBackup || !googleOAuthReady ? (
              <form
                id="login-mode-password"
                onSubmit={signInPassword}
                className="space-y-4"
                aria-busy={busy}
              >
                <Field label="מייל" htmlFor="login-email-pw">
                  <Input
                    id="login-email-pw"
                    type="email"
                    dir="ltr"
                    required
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                </Field>
                <Field label="סיסמה" htmlFor="login-password">
                  <Input
                    id="login-password"
                    type="password"
                    dir="ltr"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                  />
                </Field>
                <Button type="submit" variant="primary" size="block" disabled={busy}>
                  {busy ? 'מתחבר…' : 'כניסה'}
                </Button>
              </form>
            ) : null}

            {!googleOAuthReady ? (
              <p className="t-caption mt-3 text-center text-ink-3">
                חשבון פיילוט: {PILOT_DEMO_EMAIL} · הסיסמה מוגדרת ב־PILOT_LOGIN_PASSWORD
              </p>
            ) : null}

            {error ? (
              <LiveRegion politeness="assertive" className="mt-4">
                <ErrorState title="ההתחברות נכשלה" description={error} />
              </LiveRegion>
            ) : null}

            {demoEntry ? (
              <div className="mt-8 space-y-3 border-t border-border pt-[21px]">
                <Button
                  type="button"
                  variant="secondary"
                  size="block"
                  disabled={demoBusy || busy}
                  onClick={() => void enterAsDemo()}
                >
                  {demoBusy
                    ? 'נכנסים…'
                    : `כניסה כדמו · ${PILOT_DEMO_EMAIL}`}
                </Button>
                <p className="t-caption text-center text-ink-3">
                  או ישירות אל{' '}
                  <Link
                    href="/ops/dashboard"
                    className="text-ink-2 underline underline-offset-2"
                  >
                    לוח הבקרה
                  </Link>
                  .
                </p>
              </div>
            ) : null}
          </div>

          <details className="mt-6 group">
            <summary className="t-caption flex min-h-[var(--tap)] cursor-pointer list-none items-center text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline [&::-webkit-details-marker]:hidden">
              עזרה בהתחברות
            </summary>
            <p className="t-caption mt-2 text-ink-3">
              אם קישור המייל נפתח ב־localhost במקום בפרודקשן — השתמשו בלשונית
              «קוד» או «סיסמה». אחרי תיקון ה־Site URL לכתובת הפרודקשן, הקישור
              יעבוד.
            </p>
          </details>
        </div>
      </main>
    </div>
  )
}
