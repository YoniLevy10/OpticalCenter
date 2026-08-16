'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'

const PILOT_DEMO_EMAIL = 'OpsBrain1@gmail.com'

export function LoginForm({ demoEntry }: { demoEntry: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error') === 'auth'
  const [email, setEmail] = useState(demoEntry ? PILOT_DEMO_EMAIL : '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    authError ? 'הקישור פג או לא תקין — נסו שוב' : null,
  )
  const [busy, setBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSent(false)
    try {
      const supabase = createClient()
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '')
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${origin}/auth/callback` },
      })
      if (otpError) throw otpError
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'לא ניתן לשלוח קישור — בדקו את הגדרות ה־Auth',
      )
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
        profileId?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'כניסת דמו נכשלה')
      }
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
          נשלח קישור חד־פעמי לכתובת המייל שלכם.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            {busy ? 'שולח…' : 'שליחת קישור'}
          </Button>
        </form>

        {demoEntry ? (
          <div className="mt-4 space-y-3">
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
              מצב דמו: כניסה מיידית כמנהל מערכת, בלי Magic Link. בפריסה אמיתית
              השתמשו בקישור למייל.
            </p>
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

        {sent ? (
          <div className="mt-4">
            <Notice tone="progress">
              הקישור נשלח. בדקו את תיבת הדואר — הוא תקף לזמן מוגבל.
            </Notice>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorState title="ההתחברות נכשלה" description={error} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
