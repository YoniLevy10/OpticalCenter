'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ErrorState, Notice, SuccessNotice } from '@/components/ui/primitives'
import {
  GroupedList,
  GroupedRow,
  GroupedSection,
} from '@/components/ui/grouped-list'
import type { CountryWhatsAppCredentials } from '@/modules/whatsapp/templates-admin'

export function CountryWhatsAppForm() {
  const [creds, setCreds] = useState<CountryWhatsAppCredentials | null>(null)
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/settings/country-whatsapp')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
        const c = json.credentials as CountryWhatsAppCredentials
        setCreds(c)
        setPhoneNumberId(c.whatsapp_phone_number_id ?? '')
        setDisplayPhone(c.whatsapp_display_phone ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'טעינה נכשלה')
      }
    })()
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const body: Record<string, string | null> = {
        whatsapp_phone_number_id: phoneNumberId.trim() || null,
        whatsapp_display_phone: displayPhone.replace(/\D/g, '') || null,
      }
      if (token.trim()) body.whatsapp_access_token = token.trim()
      const res = await fetch('/api/settings/country-whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירה נכשלה')
      setCreds(json.credentials)
      setToken('')
      setNotice('פרטי WhatsApp למדינה נשמרו')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <SuccessNotice>{notice}</SuccessNotice> : null}
      <GroupedList>
        <GroupedSection
          title={`Cloud API · מדינה ${creds?.code ?? 'IL'}`}
          footer="הטוקן נשמר בשרת בלבד. השארת שדה הטוקן ריק לא משנה את הקיים."
        >
          <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
            <Field label="Phone Number ID" htmlFor="pnid">
              <Input
                id="pnid"
                dir="ltr"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </Field>
          </GroupedRow>
          <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
            <Field label="מספר תצוגה (E.164 digits)" htmlFor="disp">
              <Input
                id="disp"
                dir="ltr"
                value={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.value)}
              />
            </Field>
          </GroupedRow>
          <GroupedRow as="label" className="flex-col items-stretch gap-1.5">
            <Field
              label={
                creds?.has_access_token
                  ? 'Access Token (מוגדר · הזינו חדש להחלפה)'
                  : 'Access Token'
              }
              htmlFor="tok"
            >
              <Input
                id="tok"
                type="password"
                dir="ltr"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
              />
            </Field>
          </GroupedRow>
          <GroupedRow className="flex-col items-stretch">
            <Notice tone="neutral">
              ניתן גם להגדיר דרך משתני סביבה (WHATSAPP_*). ערכי DB משמשים ב־intake
              כשקיימים.
            </Notice>
          </GroupedRow>
        </GroupedSection>
      </GroupedList>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'שומר…' : 'שמירת Cloud API'}
      </Button>
    </form>
  )
}
