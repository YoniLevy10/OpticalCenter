'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import {
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
  SuccessNotice,
} from '@/components/ui/primitives'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge'
import { cn } from '@/lib/utils'
import type { MemSettings } from '@/lib/data/memory-store'

type SectionId = 'profile' | 'notifications' | 'permissions' | 'whatsapp' | 'system'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'פרופיל' },
  { id: 'notifications', label: 'התראות' },
  { id: 'permissions', label: 'הרשאות' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'system', label: 'מערכת' },
]

export function SettingsForm({ initial }: { initial: MemSettings }) {
  const [form, setForm] = useState(initial)
  const [section, setSection] = useState<SectionId>('profile')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function saveSection(e: FormEvent) {
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
      setNotice('השינויים נשמרו בהצלחה')
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
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <nav
        aria-label="קטגוריות הגדרות"
        className="flex shrink-0 gap-1 overflow-x-auto md:w-44 md:flex-col md:overflow-visible"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSection(s.id)
              setNotice(null)
              setError(null)
            }}
            className={cn(
              't-control whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-start transition-colors',
              section === s.id
                ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
                : 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <Panel flush className="min-w-0 flex-1 overflow-hidden">
        <PanelHeader
          title={SECTIONS.find((s) => s.id === section)?.label ?? 'הגדרות'}
          meta="שמירה ברמת קטגוריה"
        />
        <form onSubmit={saveSection} className="space-y-4 p-4">
          {error ? <ErrorState title="שגיאה" description={error} /> : null}
          {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}

          {section === 'profile' ? (
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
            </div>
          ) : null}

          {section === 'notifications' ? (
            <div className="grid gap-3">
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
              <Notice tone="neutral">
                התראות טכנאים בפיילוט נשלחות ב־WhatsApp עם לינק לתקלה.
              </Notice>
            </div>
          ) : null}

          {section === 'permissions' ? (
            <div className="space-y-3">
              <p className="t-body text-ink-2">
                ניהול הרשאות מתבצע במסך המשתמשים — בשפה עסקית לפי תפקיד (מנהל
                סניף, טכנאי, מנהל מערכת).
              </p>
              <Notice tone="progress">
                לטכנאים יש להגדיר{' '}
                <strong>מספר טלפון נייד</strong> במסך המשתמשים — אליו נשלחת
                הודעת השיוך כשמשייכים תקלה (WhatsApp למספר).
              </Notice>
              <Button asChild variant="secondary">
                <Link href="/ops/users">מעבר למשתמשים והרשאות</Link>
              </Button>
            </div>
          ) : null}

          {section === 'whatsapp' ? (
            <div className="grid gap-3">
              <Field label="מספר עסקי WhatsApp" htmlFor="wa">
                <Input
                  id="wa"
                  dir="ltr"
                  value={form.wa_business_phone}
                  onChange={(e) => set('wa_business_phone', e.target.value)}
                  placeholder="9725…"
                />
              </Field>
              {!form.wa_business_phone?.replace(/\D/g, '') ? (
                <Notice tone="warning">
                  בלי מספר עסקי לא ניתן להדפיס QR תקין לחנויות. הזינו את מספר
                  ה־WhatsApp Business (ספרות עם קידומת מדינה, בלי +) ואז הדפיסו
                  מחדש מ־/ops/stores/print-qr.
                </Notice>
              ) : (
                <Notice tone="progress">
                  המספר משמש לקישורי QR/NFC. אחרי שינוי — הדפיסו QR מחדש.
                </Notice>
              )}
            </div>
          ) : null}

          {section === 'system' ? (
            <div className="space-y-4">
              <ThemeToggle />
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
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3">
                <p className="t-section flex flex-wrap items-center gap-2 text-ink">
                  תכונות עתידיות
                  <ComingSoonBadge />
                </p>
                <ul className="t-caption mt-2 space-y-1 text-ink-3">
                  <li>Web Push לטכנאים</li>
                  <li>דוח חודשי אוטומטי ב-email</li>
                  <li>תמיכה בצרפת (i18n)</li>
                </ul>
              </div>
            </div>
          ) : null}

          {section !== 'permissions' ? (
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'שומר…' : 'שמירת קטגוריה'}
            </Button>
          ) : null}
        </form>
      </Panel>
    </div>
  )
}
