'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/primitives'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const supabase = createClient()
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '')
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${origin}/ops` },
      })
      if (error) throw error
      setStatus('נשלח קישור התחברות למייל (אם הופעל Auth ב־Supabase).')
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : 'לא ניתן לשלוח קישור — בדקו הגדרות Auth',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center bg-canvas px-4 text-foreground"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-accent text-[10px] font-semibold text-white">
          OC
        </span>
        <span className="text-[13px] font-semibold">MaintainOS</span>
      </div>
      <h1 className="text-[21px] font-semibold tracking-tight">התחברות</h1>
      <p className="mt-1 text-[13px] text-muted">
        פיילוט ישראל · קישור קסם למייל (Supabase Auth)
      </p>
      <Card className="mt-6 p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-[13px]">
            אימייל
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="you@optical-center.demo"
            />
          </label>
          <Button type="submit" variant="primary" size="lg" disabled={busy}>
            {busy ? 'שולח…' : 'שלח קישור'}
          </Button>
        </form>
        {status ? <p className="mt-4 text-[13px] text-muted">{status}</p> : null}
      </Card>
      <p className="mt-6 text-[12px] text-faint">
        בפיילוט אפשר גם להיכנס ישירות ל־
        <Link href="/ops" className="text-accent underline">
          /ops
        </Link>{' '}
        בלי Auth.
      </p>
    </div>
  )
}
