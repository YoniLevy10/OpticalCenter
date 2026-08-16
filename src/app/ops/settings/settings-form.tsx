'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice, Panel, PanelHeader } from '@/components/ui/primitives'
import type { MemSettings } from '@/lib/data/memory-store'

export function SettingsForm({ initial }: { initial: MemSettings }) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירה נכשלה')
      setForm(json.settings)
      setNotice('ההגדרות נשמרו (מצב דמו/זיכרון)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  function set<K extends keyof MemSettings>(key: K, value: MemSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Panel flush className="overflow-hidden">
      <PanelHeader title="מותג · WhatsApp · SLA" meta="הגדרות תפעול" />
      <form onSubmit={onSubmit} className="space-y-4 p-4">
        {error ? <ErrorState title="שגיאה" description={error} /> : null}
        {notice ? <Notice tone="progress">{notice}</Notice> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="שם מותג" htmlFor="brand">
            <Input
              id="brand"
              value={form.brand_name}
              onChange={(e) => set('brand_name', e.target.value)}
            />
          </Field>
          <Field label="תווית מדינה" htmlFor="country">
            <Input
              id="country"
              value={form.country_label}
              onChange={(e) => set('country_label', e.target.value)}
            />
          </Field>
          <Field label="מספר עסקי WhatsApp" htmlFor="wa">
            <Input
              id="wa"
              dir="ltr"
              value={form.wa_business_phone}
              onChange={(e) => set('wa_business_phone', e.target.value)}
              placeholder="9725…"
            />
          </Field>
          <Field label="מייל התראות SLA" htmlFor="email">
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={form.notify_email}
              onChange={(e) => set('notify_email', e.target.value)}
              placeholder="ops@optical-center.co.il"
            />
          </Field>
        </div>

        <h3 className="t-section text-ink">שעות תגובה (SLA)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ['sla_respond_hours_critical', 'קריטי'],
              ['sla_respond_hours_high', 'גבוה'],
              ['sla_respond_hours_medium', 'בינוני'],
              ['sla_respond_hours_low', 'נמוך'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={key}>
              <Input
                id={key}
                type="number"
                min={1}
                max={168}
                className="t-num"
                value={form[key]}
                onChange={(e) => set(key, Number(e.target.value) || 1)}
              />
            </Field>
          ))}
        </div>

        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'שומר…' : 'שמירת הגדרות'}
        </Button>
      </form>
    </Panel>
  )
}
