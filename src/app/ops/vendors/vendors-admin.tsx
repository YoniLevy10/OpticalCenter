'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'

type VendorRow = {
  id: string
  name: string
  contact_phone: string | null
  contact_email: string | null
  specialties: string
  active: boolean
  webhook_url: string | null
  has_hmac: boolean
}

export function VendorsAdmin() {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialties, setSpecialties] = useState('hvac')
  const [dispatchTicketId, setDispatchTicketId] = useState('')
  const [dispatchVendorId, setDispatchVendorId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendors')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setVendors(json.vendors ?? [])
      if (!dispatchVendorId && json.vendors?.[0]?.id) {
        setDispatchVendorId(json.vendors[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [dispatchVendorId])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact_phone: phone || null,
          contact_email: email || null,
          specialties,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setName('')
      setPhone('')
      setEmail('')
      setNotice('הספק נוסף')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(v: VendorRow) {
    setBusy(true)
    try {
      const res = await fetch(`/api/vendors/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !v.active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function onDispatch(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const idempotencyKey = `hq-${dispatchTicketId}-${dispatchVendorId}-${Date.now()}`
      const res = await fetch('/api/partner/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: dispatchTicketId.trim(),
          vendorId: dispatchVendorId,
          idempotencyKey,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      setNotice(
        `שיגור לשותף: ${json.dispatch?.status ?? 'ok'} · HMAC ${String(json.dispatch?.request_hmac ?? '').slice(0, 10)}…`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {notice ? <Notice tone="progress">{notice}</Notice> : null}
      {error ? <ErrorState title={error} /> : null}

      <Panel>
        <PanelHeader title="ספק חדש" />
        <form onSubmit={onCreate} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="שם" htmlFor="vendor-name">
            <Input
              id="vendor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="התמחות" htmlFor="vendor-spec">
            <Input
              id="vendor-spec"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
            />
          </Field>
          <Field label="טלפון" htmlFor="vendor-phone">
            <Input
              id="vendor-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label="אימייל" htmlFor="vendor-email">
            <Input
              id="vendor-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !name.trim()}>
              הוספת ספק
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="שיגור לשותף (Partner dispatch)" meta="HMAC + Idempotency" />
        <form onSubmit={onDispatch} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="מזהה תקלה" htmlFor="dispatch-ticket">
            <Input
              id="dispatch-ticket"
              value={dispatchTicketId}
              onChange={(e) => setDispatchTicketId(e.target.value)}
              placeholder="uuid"
              dir="ltr"
              required
            />
          </Field>
          <Field label="ספק" htmlFor="dispatch-vendor">
            <select
              id="dispatch-vendor"
              className="t-body h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3"
              value={dispatchVendorId}
              onChange={(e) => setDispatchVendorId(e.target.value)}
            >
              {vendors
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" disabled={busy || !dispatchTicketId}>
              שיגור עם מפתח אידמפוטנטי
            </Button>
          </div>
        </form>
      </Panel>

      <Panel flush elevated className="overflow-hidden">
        {loading ? (
          <p className="t-body p-4 text-ink-3">טוען…</p>
        ) : vendors.length === 0 ? (
          <EmptyState title="אין ספקים" description="הוסיפו ספק חיצוני לשיגור." />
        ) : (
          <>
            <AdminRowList>
              {vendors.map((v) => (
                <AdminRow
                  key={v.id}
                  title={v.name}
                  subtitle={v.specialties}
                  footer={
                    <span dir="ltr" className="t-caption text-ink-3">
                      {v.contact_phone || '—'}
                      {v.contact_email ? ` · ${v.contact_email}` : ''}
                    </span>
                  }
                  trailing={
                    <Button
                      type="button"
                      size="touch"
                      variant="secondary"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => void toggleActive(v)}
                    >
                      {v.active ? 'השבתה' : 'הפעלה'}
                    </Button>
                  }
                />
              ))}
            </AdminRowList>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TH>שם</TH>
                  <TH>התמחות</TH>
                  <TH>יצירת קשר</TH>
                  <TH>HMAC</TH>
                  <TH className="w-[120px]">פעולות</TH>
                </THead>
                <TBody>
                  {vendors.map((v) => (
                    <TR key={v.id}>
                      <TD>
                        <span className="t-body-strong text-ink">{v.name}</span>
                        {!v.active ? (
                          <span className="t-caption ms-2 text-ink-3">לא פעיל</span>
                        ) : null}
                      </TD>
                      <TD>
                        <span className="t-meta text-ink-2">{v.specialties}</span>
                      </TD>
                      <TD>
                        <span className="t-meta block text-ink-2" dir="ltr">
                          {v.contact_phone || '—'}
                        </span>
                        <span className="t-caption block text-ink-3" dir="ltr">
                          {v.contact_email || ''}
                        </span>
                      </TD>
                      <TD>
                        <span className="t-caption text-ink-3">
                          {v.has_hmac ? 'מוכן' : '—'}
                        </span>
                      </TD>
                      <TD>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void toggleActive(v)}
                        >
                          {v.active ? 'השבתה' : 'הפעלה'}
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
