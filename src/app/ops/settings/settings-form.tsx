'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice, SuccessNotice } from '@/components/ui/primitives'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge'
import { SegmentedButtons } from '@/components/ui/segmented'
import {
  GroupedList,
  GroupedRow,
  GroupedSection,
} from '@/components/ui/grouped-list'
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
    <div className="flex flex-col gap-4">
      <SegmentedButtons
        fill
        className="w-full max-md:overflow-x-auto"
        activeKey={section}
        onChange={(key) => {
          setSection(key as SectionId)
          setNotice(null)
          setError(null)
        }}
        segments={SECTIONS.map((s) => ({ key: s.id, label: s.label }))}
      />

      <form onSubmit={saveSection} className="space-y-4">
        {error ? <ErrorState title="שגיאה" description={error} /> : null}
        {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}

        <GroupedList>
          {section === 'profile' ? (
            <GroupedSection title="זהות מותג" footer="שמירה ברמת קטגוריה">
              <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
                <Field label="שם מותג" htmlFor="brand">
                  <Input
                    id="brand"
                    value={form.brand_name}
                    onChange={(e) => set('brand_name', e.target.value)}
                  />
                </Field>
              </GroupedRow>
              <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
                <Field label="תווית מדינה" htmlFor="country">
                  <Input
                    id="country"
                    value={form.country_label}
                    onChange={(e) => set('country_label', e.target.value)}
                  />
                </Field>
              </GroupedRow>
            </GroupedSection>
          ) : null}

          {section === 'notifications' ? (
            <GroupedSection
              title="ערוץ התראות"
              footer="הפרות SLA, תקלות ללא שיוך, ודוח חודשי."
            >
              <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
                <Field label="מייל התראות Ops" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={form.notify_email}
                    onChange={(e) => set('notify_email', e.target.value)}
                    placeholder="ops@optical-center.co.il"
                  />
                </Field>
              </GroupedRow>
              <GroupedRow className="flex-col items-stretch">
                <Notice tone="neutral">
                  התראות טכנאים בפיילוט נשלחות ב־WhatsApp/SMS עם לינק לתקלה.
                </Notice>
              </GroupedRow>
            </GroupedSection>
          ) : null}

          {section === 'permissions' ? (
            <GroupedSection title="הרשאות ותפקידים">
              <GroupedRow className="flex-col items-stretch gap-2">
                <p className="t-body text-ink-2">
                  ניהול הרשאות מתבצע במסך המשתמשים — בשפה עסקית לפי תפקיד (מנהל
                  סניף, טכנאי, מנהל מערכת).
                </p>
                <Notice tone="progress">
                  לטכנאים יש להגדיר <strong>מספר טלפון נייד</strong> במסך
                  המשתמשים — אליו נשלחת הודעת השיוך כשמשייכים תקלה.
                </Notice>
                <Button asChild variant="secondary">
                  <Link href="/ops/users">מעבר למשתמשים והרשאות</Link>
                </Button>
              </GroupedRow>
            </GroupedSection>
          ) : null}

          {section === 'whatsapp' ? (
            <GroupedSection title="WhatsApp Business">
              <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
                <Field label="מספר עסקי WhatsApp" htmlFor="wa">
                  <Input
                    id="wa"
                    dir="ltr"
                    value={form.wa_business_phone}
                    onChange={(e) => set('wa_business_phone', e.target.value)}
                    placeholder="972552819086"
                  />
                </Field>
              </GroupedRow>
              <GroupedRow className="flex-col items-stretch">
                {!form.wa_business_phone?.replace(/\D/g, '') ? (
                  <Notice tone="warning">
                    בלי מספר עסקי לא ניתן להדפיס QR תקין לחנויות. הזינו את מספר
                    ה־WhatsApp Business ואז הדפיסו מחדש מ־/ops/stores/print-qr.
                  </Notice>
                ) : (
                  <Notice tone="progress">
                    המספר משמש לקישורי QR/NFC. אחרי שינוי — הדפיסו QR מחדש.
                  </Notice>
                )}
              </GroupedRow>
            </GroupedSection>
          ) : null}

          {section === 'system' ? (
            <>
              <GroupedSection title="ערכת נושא">
                <GroupedRow>
                  <ThemeToggle />
                </GroupedRow>
              </GroupedSection>
              <GroupedSection title="שעות תגובה (SLA)">
                {(
                  [
                    ['sla_respond_hours_critical', 'קריטי'],
                    ['sla_respond_hours_high', 'גבוה'],
                    ['sla_respond_hours_medium', 'בינוני'],
                    ['sla_respond_hours_low', 'נמוך'],
                  ] as const
                ).map(([key, label]) => (
                  <GroupedRow
                    key={key}
                    as="label"
                    className="justify-between gap-4"
                  >
                    <span className="t-body text-ink">{label}</span>
                    <Input
                      id={key}
                      type="number"
                      min={1}
                      max={168}
                      className="t-num w-20 text-end"
                      value={form[key]}
                      onChange={(e) => set(key, Number(e.target.value) || 1)}
                    />
                  </GroupedRow>
                ))}
              </GroupedSection>
              <GroupedSection title="תכונות עתידיות">
                <GroupedRow className="flex-col items-stretch gap-2">
                  <p className="t-section flex flex-wrap items-center gap-2 text-ink">
                    בקרוב
                    <ComingSoonBadge />
                  </p>
                  <ul className="t-caption space-y-1 text-ink-3">
                    <li>Web Push לטכנאים</li>
                    <li>תמיכה בצרפת (i18n)</li>
                  </ul>
                </GroupedRow>
              </GroupedSection>
            </>
          ) : null}
        </GroupedList>

        {section !== 'permissions' ? (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'שומר…' : 'שמירת קטגוריה'}
          </Button>
        ) : null}
      </form>
    </div>
  )
}
