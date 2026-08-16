'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'

const PILOT_DEMO_EMAIL = 'OpsBrain1@gmail.com'

type Mode = 'link' | 'otp' | 'password'

export function LoginForm({ demoEntry }: { demoEntry: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error') === 'auth'
  const [mode, setMode] = useState<Mode>('link')
  const [email, setEmail] = useState(PILOT_DEMO_EMAIL)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    authError
      ? 'הקישור פג, לא תקין, או הוביל ל־localhost — נסו קוד או סיסמה'
      : null,
  )
  const [busy, setBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)

  async function requestLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSent(false)
    setHint(null)
    try {
      const res = await fetch('/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        hint?: string
        next?: string
      }
      if (!res.ok) throw new Error(data.error || 'שליחה נכשלה')
      setSent(true)
      setHint(data.hint || null)
      setMode('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/request-login?mode=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: otp.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        home?: string
      }
      if (!res.ok) throw new Error(data.error || 'קוד לא תקין')
      router.replace(data.home || '/ops/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'אימות נכשל')
    } finally {
      setBusy(false)
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
      router.replace(data.home || '/ops/dashboard')
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
    <div className="dvh-screen safe-pt safe-pb flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span
            aria-hidden
            className="t-caption inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--tenant)] font-semibold text-[var(--tenant-contrast)]"
          >
            OC
          </span>
          <div>
            <p className="t-body-strong text-ink">MaintainOS</p>
            <p className="t-caption text-ink-3">Optical Center · ישראל</p>
          </div>
        </div>

        <h1 className="t-title text-ink">התחברות</h1>
        <p className="t-body mt-1 text-ink-2">
          קישור למייל, קוד חד־פעמי, או סיסמה — לפי מה שזמין.
        </p>

        <div className="mt-4 flex gap-2">
          {(
            [
              ['link', 'קישור'],
              ['otp', 'קוד'],
              ['password', 'סיסמה'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`t-caption min-h-[var(--tap)] flex-1 rounded-[var(--radius-md)] border px-2 ${
                mode === id
                  ? 'border-[var(--tenant)] bg-[color-mix(in_srgb,var(--tenant)_8%,white)] text-ink'
                  : 'border-border bg-surface text-ink-2'
              }`}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'link' ? (
          <form onSubmit={requestLink} className="mt-6 space-y-4">
            <Field label="כתובת מייל" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                dir="ltr"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@optical-center.co.il"
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="block"
              disabled={busy || !email.trim()}
            >
              {busy ? 'שולח…' : 'שליחת קישור / קוד'}
            </Button>
          </form>
        ) : null}

        {mode === 'otp' ? (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <Field label="כתובת מייל" htmlFor="otp-email">
              <Input
                id="otp-email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="קוד מהמייל" htmlFor="login-otp">
              <Input
                id="login-otp"
                type="text"
                dir="ltr"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="12345678"
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="block"
              disabled={busy || !otp.trim()}
            >
              {busy ? 'מאמת…' : 'אימות קוד וכניסה'}
            </Button>
          </form>
        ) : null}

        {mode === 'password' ? (
          <form onSubmit={signInPassword} className="mt-6 space-y-4">
            <Field label="כתובת מייל" htmlFor="pw-email">
              <Input
                id="pw-email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="block"
              disabled={busy || !password}
            >
              {busy ? 'מתחבר…' : 'כניסה עם סיסמה'}
            </Button>
          </form>
        ) : null}

        {sent ? (
          <div className="mt-4">
            <Notice tone="progress">
              {hint ||
                'הקישור נשלח. אם הוא נפתח ב־localhost — עברו ללשונית «קוד» או «סיסמה».'}
            </Notice>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorState title="ההתחברות נכשלה" description={error} />
          </div>
        ) : null}

        {demoEntry ? (
          <div className="mt-6 space-y-3">
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
            <p className="t-caption text-ink-3">
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

        <p className="t-caption mt-6 text-ink-3">
          אם Supabase Site URL עדיין מוגדר ל־localhost, קישור המייל יישבר —
          השתמשו בסיסמה או בקוד. אחרי תיקון ה־Site URL לכתובת הפרודקשן, הקישור
          יעבוד כרגיל.
        </p>
      </div>
    </div>
  )
}
