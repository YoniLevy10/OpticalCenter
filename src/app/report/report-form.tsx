'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'

export function PublicReportForm({
  initialStore,
  stores,
}: {
  initialStore: string
  stores: { code: string; name: string }[]
}) {
  const [storeCode, setStoreCode] = useState(initialStore)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [display, setDisplay] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode,
          description,
          reporterName: name || undefined,
          reporterPhone: phone || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      setTicketId(json.ticket?.id ?? null)
      setDisplay(json.ticket?.display_number ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  if (ticketId) {
    return (
      <div className="space-y-4 text-center">
        <Notice tone="progress">
          הדיווח התקבל
          {display ? ` · ${display}` : ''}
        </Notice>
        <p className="t-body text-ink-2">
          צוות התחזוקה יטפל בתקלה. אפשר לסגור את החלון.
        </p>
        <Button asChild variant="secondary">
          <Link href="/ops/tickets">מעבר לתור (HQ)</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      <Field label="חנות" htmlFor="report-store">
        <Select
          id="report-store"
          required
          value={storeCode}
          onChange={(e) => setStoreCode(e.target.value)}
        >
          <option value="">בחרו חנות…</option>
          {stores.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} · {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="שם (אופציונלי)" htmlFor="report-name">
        <Input
          id="report-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם מדווח"
        />
      </Field>
      <Field label="טלפון (אופציונלי)" htmlFor="report-phone">
        <Input
          id="report-phone"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05…"
        />
      </Field>
      <Field label="תיאור התקלה" htmlFor="report-desc">
        <Textarea
          id="report-desc"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="לדוגמה: מזגן לא מקרר / נזילה ליד הדלפק"
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="block"
        disabled={busy || !storeCode || !description.trim()}
      >
        {busy ? 'שולח…' : 'שליחת דיווח'}
      </Button>
      <p className="t-caption text-center text-ink-3">
        עדיף לדווח דרך WhatsApp אחרי סריקת QR בחנות. טופס זה הוא גיבוי.
      </p>
    </form>
  )
}
