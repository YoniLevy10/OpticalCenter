'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Notice, Panel, PanelHeader } from '@/components/ui/primitives'

export function StoreCreateForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          city: city.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setCode('')
      setName('')
      setCity('')
      setNotice(`נוספה חנות ${json.store?.code ?? ''}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel flush className="overflow-hidden">
      <PanelHeader title="הוספת חנות" meta="ישראל" />
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="קוד" htmlFor="store-code">
            <Input
              id="store-code"
              dir="ltr"
              inputMode="numeric"
              pattern="\d{1,6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="172"
            />
          </Field>
          <Field label="שם" htmlFor="store-name">
            <Input
              id="store-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="תל אביב…"
            />
          </Field>
          <Field label="עיר" htmlFor="store-city">
            <Input
              id="store-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="תל אביב"
            />
          </Field>
        </div>
        {error ? <Notice tone="warning">{error}</Notice> : null}
        {notice ? <Notice tone="progress">{notice}</Notice> : null}
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'שומר…' : 'הוספה'}
        </Button>
      </form>
    </Panel>
  )
}
