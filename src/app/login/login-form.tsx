'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

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
    <div className="dvh-screen safe-pt safe-pb relative flex items-center justify-center overflow-hidden bg-canvas px-4">
      {/* Bamakor-style soft glow — tenant tint, not product blue */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[var(--tenant-soft)] opacity-70 blur-[64px]"
      />
      <div className="relative w-full max-w-sm">
        {/* Brand block — centered, premium */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-pop)] ring-1 ring-border">
            <span
              className="t-display flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--tenant)] text-[var(--tenant-contrast)]"
              aria-hidden
            >
              OC
            </span>
          </div>
          <h1 className="t-title text-ink">MaintainOS</h1>
          <p className="t-body mt-1.5 text-ink-2">Optical Center · ניהול תחזוקה</p>
        </div>

        {/* Mode tabs — refined */}
        <div className="mb-6 inline-flex w-full gap-0.5 rounded-[var(--radius-md)] border border-border bg-surface-sunken/50 p-1">
          {(
            [
              { key: 'link', label: 'קישור במייל' },
              { key: 'otp', label: 'קוד חד-פעמי' },
              { key: 'password', label: 'סיסמה' },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                't-control flex-1 rounded-[var(--radius-sm)] px-2 py-2 transition-all duration-[var(--dur-1)]',
                mode === m.key
                  ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-3 hover:text-ink-2',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'link' ? (
          <form onSubmit={requestLink} className="space-y-4">
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
          <form onSubmit={verifyOtp} className="space-y-4">
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
            <Field
              label="קוד מהמייל"
              htmlFor="login-otp"
              hint="6–8 ספרות שנשלחו למייל"
            >
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
                className="t-num text-center tracking-[0.2em]"
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
          <form onSubmit={signInPassword} className="space-y-4">
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
                placeholder="••••••••"
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
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 animate-pulse rounded-full bg-[var(--signal-progress)]"
                />
                {hint ||
                  'הקישור נשלח. אם הוא נפתח ב־localhost — עברו ללשונית «קוד» או «סיסמה».'}
              </div>
            </Notice>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorState title="ההתחברות נכשלה" description={error} />
          </div>
        ) : null}

        {demoEntry ? (
          <div className="mt-8 space-y-3 border-t border-border pt-5">
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

        <details className="mt-6 group">
          <summary className="t-caption cursor-pointer list-none text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline [&::-webkit-details-marker]:hidden">
            עזרה בהתחברות
          </summary>
          <p className="t-caption mt-2 text-ink-3">
            אם קישור המייל נפתח ב־localhost במקום בפרודקשן — השתמשו בלשונית
            «קוד» או «סיסמה». אחרי תיקון ה־Site URL לכתובת הפרודקשן, הקישור
            יעבוד.
          </p>
        </details>
      </div>
    </div>
  )
}
