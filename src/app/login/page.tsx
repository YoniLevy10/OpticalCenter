'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-semibold tracking-tight">התחברות MaintainOS</h1>
      <p className="mt-1 text-sm text-zinc-500">
        פיילוט ישראל · קישור קסם למייל (Supabase Auth)
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          אימייל
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            placeholder="you@optical-center.demo"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'שולח…' : 'שלח קישור'}
        </button>
      </form>
      {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
      <p className="mt-8 text-xs text-zinc-400">
        בפיילוט אפשר גם להיכנס ישירות ל־
        <a href="/ops" className="underline">
          /ops
        </a>{' '}
        בלי Auth.
      </p>
    </div>
  )
}
