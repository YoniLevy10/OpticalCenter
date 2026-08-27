'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LiveRegion } from '@/components/ui/a11y'

type HealthPayload = {
  ok?: boolean
  status?: string
  timestamp?: string
}

export function StatusHealthButton() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkHealth() {
    setBusy(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as HealthPayload
      if (!res.ok) {
        throw new Error(data.status || `HTTP ${res.status}`)
      }
      setResult(
        data.ok === false
          ? 'השרת ענה — סטטוס לא תקין'
          : `תקין · ${data.timestamp ?? new Date().toISOString()}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'בדיקה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="touch"
        disabled={busy}
        onClick={() => void checkHealth()}
      >
        {busy ? 'בודק…' : 'בדיקת חיים עכשיו'}
      </Button>
      {result ? (
        <LiveRegion politeness="polite">
          <p className="t-body text-[var(--signal-resolved)]">{result}</p>
        </LiveRegion>
      ) : null}
      {error ? (
        <LiveRegion politeness="assertive">
          <p className="t-body text-[var(--signal-critical)]" role="alert">
            {error}
          </p>
        </LiveRegion>
      ) : null}
    </div>
  )
}
