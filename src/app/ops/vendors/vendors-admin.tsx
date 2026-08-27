'use client'

import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
} from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'
import { Modal } from '@/components/ui/overlay'
import { TICKET_CATEGORY_LABELS_HE, TICKET_CATEGORIES } from '@/modules/tickets/constants'
import { cn } from '@/lib/utils'

export type VendorDispatchHint = {
  ticket_id: string
  ticket_display: string | null
  created_at: string
  status?: string
}

export type VendorRow = {
  id: string
  name: string
  contact_phone: string | null
  contact_email: string | null
  specialties: string
  active: boolean
  webhook_url: string | null
  has_hmac: boolean
  open_tickets: number
  avg_response_label: string
  recent: VendorDispatchHint[]
}

function specialtyLabel(raw: string) {
  const key = raw.trim().toLowerCase()
  return TICKET_CATEGORY_LABELS_HE[key] ?? raw
}

function contactLine(v: VendorRow) {
  if (v.contact_phone && v.contact_email) return v.contact_phone
  return v.contact_phone || v.contact_email || '—'
}

function fmtShort(iso: string) {
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function VendorsAdmin({
  initialVendors,
}: {
  initialVendors?: VendorRow[]
}) {
  const [vendors, setVendors] = useState<VendorRow[]>(initialVendors ?? [])
  const [loading, setLoading] = useState(!initialVendors)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dispatchOpen, setDispatchOpen] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialties, setSpecialties] = useState('hvac')
  const [notes, setNotes] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [dispatchTicketId, setDispatchTicketId] = useState('')
  const [dispatchVendorId, setDispatchVendorId] = useState(
    initialVendors?.find((v) => v.active)?.id ?? '',
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vendors')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      const next = (json.vendors ?? []) as VendorRow[]
      setVendors((prev) => {
        const statsById = new Map(prev.map((v) => [v.id, v]))
        return next.map((v) => {
          const prevRow = statsById.get(v.id)
          return {
            ...v,
            open_tickets: prevRow?.open_tickets ?? v.open_tickets ?? 0,
            avg_response_label: prevRow?.avg_response_label ?? v.avg_response_label ?? '—',
            recent: prevRow?.recent ?? v.recent ?? [],
          }
        })
      })
      if (!dispatchVendorId && next[0]?.id) {
        setDispatchVendorId(next.find((v) => v.active)?.id ?? next[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [dispatchVendorId])

  useEffect(() => {
    if (initialVendors) return
    void load()
  }, [initialVendors, load])

  const categories = useMemo(() => {
    const set = new Set(vendors.map((v) => v.specialties.trim()).filter(Boolean))
    return Array.from(set).sort((a, b) =>
      specialtyLabel(a).localeCompare(specialtyLabel(b), 'he'),
    )
  }, [vendors])

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      if (categoryFilter && v.specialties.trim() !== categoryFilter) return false
      if (statusFilter === 'active' && !v.active) return false
      if (statusFilter === 'inactive' && v.active) return false
      return true
    })
  }, [vendors, categoryFilter, statusFilter])

  function resetCreate() {
    setName('')
    setPhone('')
    setEmail('')
    setSpecialties('hvac')
    setNotes('')
    setWebhookUrl('')
  }

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
          webhook_url: webhookUrl || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      resetCreate()
      setCreateOpen(false)
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
      setNotice(`שיגור לספק בוצע · סטטוס ${json.dispatch?.status ?? 'ok'}`)
      setDispatchTicketId('')
      setDispatchOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? <Notice tone="progress">{notice}</Notice> : null}
      {error ? <ErrorState title={error} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="תחום" htmlFor="vendor-cat-filter">
            <Select
              id="vendor-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-w-[9rem]"
            >
              <option value="">כל התחומים</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {specialtyLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="סטטוס" htmlFor="vendor-status-filter">
            <Select
              id="vendor-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[8rem]"
            >
              <option value="">הכל</option>
              <option value="active">פעיל</option>
              <option value="inactive">לא פעיל</option>
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDispatchOpen((o) => !o)}
          >
            שיגור לשותף
          </Button>
          <Button
            type="button"
            variant="primary"
            size="touch"
            className="md:h-9 md:px-3.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            ספק חדש
          </Button>
        </div>
      </div>

      <p className="t-meta t-num text-ink-3">{filtered.length} ספקים</p>

      {dispatchOpen ? (
        <Panel elevated className="!p-4">
          <p className="t-caption mb-3 text-ink-3">
            כלי מתקדם · שיגור תקלה לספק חיצוני
          </p>
          <form onSubmit={onDispatch} className="grid gap-3 sm:grid-cols-2">
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
              <Select
                id="dispatch-vendor"
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
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" variant="secondary" size="sm" disabled={busy || !dispatchTicketId}>
                שיגור
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDispatchOpen(false)}
              >
                סגירה
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next)
          if (!next) resetCreate()
        }}
        title="ספק חדש"
        description="פרטי ספק · יצירת קשר · הערות"
        className="w-[min(92vw,520px)]"
      >
        <form onSubmit={onCreate} className="space-y-5">
          <section className="space-y-3">
            <h3 className="t-caption text-ink-3">פרטי ספק</h3>
            <Field label="שם" htmlFor="vendor-name">
              <Input
                id="vendor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="תחום / התמחות" htmlFor="vendor-spec">
              <Select
                id="vendor-spec"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TICKET_CATEGORY_LABELS_HE[c] ?? c}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="t-caption text-ink-3">יצירת קשר</h3>
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="t-caption text-ink-3">הערות</h3>
            <Field label="הערות פנימיות" htmlFor="vendor-notes" hint="אופציונלי">
              <Textarea
                id="vendor-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="הערות לצוות התפעול…"
              />
            </Field>
            <Field
              label="כתובת Webhook"
              htmlFor="vendor-webhook"
              hint="אופציונלי · לשיגור אוטומטי"
            >
              <Input
                id="vendor-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                dir="ltr"
                placeholder="https://…"
              />
            </Field>
          </section>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setCreateOpen(false)
                resetCreate()
              }}
            >
              ביטול
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy || !name.trim()}>
              {busy ? 'שומר…' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Modal>

      <Panel flush elevated className="overflow-hidden">
        {loading ? (
          <p className="t-body p-4 text-ink-3">טוען…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="אין ספקים"
            description={
              categoryFilter || statusFilter
                ? 'נסו לשנות את הסינון.'
                : 'הוסיפו ספק חיצוני לשיגור תקלות.'
            }
          />
        ) : (
          <>
            <AdminRowList>
              {filtered.map((v) => {
                const open = expandedId === v.id
                return (
                  <div key={v.id}>
                    <AdminRow
                      title={
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-start"
                          onClick={() => setExpandedId(open ? null : v.id)}
                        >
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform',
                              open && 'rotate-180',
                            )}
                            aria-hidden
                          />
                          <span>
                            {v.name}
                            {!v.active ? (
                              <span className="t-caption ms-2 text-ink-3">לא פעיל</span>
                            ) : null}
                          </span>
                        </button>
                      }
                      subtitle={`${specialtyLabel(v.specialties)} · ${v.open_tickets} פתוחות`}
                      footer={
                        <span dir="ltr" className="t-caption text-ink-3">
                          {contactLine(v)}
                        </span>
                      }
                      trailing={
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void toggleActive(v)}
                        >
                          {v.active ? 'השבתה' : 'הפעלה'}
                        </Button>
                      }
                    />
                    {open ? <VendorExpand v={v} /> : null}
                  </div>
                )
              })}
            </AdminRowList>

            <div className="hidden md:block">
              <Table>
                <THead>
                  <TH>שם</TH>
                  <TH>תחום</TH>
                  <TH>יצירת קשר</TH>
                  <TH>פתוחות</TH>
                  <TH>זמן תגובה ממוצע</TH>
                  <TH className="w-[120px]">פעולות</TH>
                </THead>
                <TBody>
                  {filtered.map((v) => {
                    const open = expandedId === v.id
                    return (
                      <Fragment key={v.id}>
                        <TR>
                          <TD>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-start"
                              onClick={() => setExpandedId(open ? null : v.id)}
                            >
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform',
                                  open && 'rotate-180',
                                )}
                                aria-hidden
                              />
                              <span className="t-body-strong text-ink">{v.name}</span>
                              {!v.active ? (
                                <span className="t-caption text-ink-3">לא פעיל</span>
                              ) : null}
                            </button>
                          </TD>
                          <TD>
                            <span className="t-meta text-ink-2">
                              {specialtyLabel(v.specialties)}
                            </span>
                          </TD>
                          <TD>
                            <span className="t-meta block text-ink-2" dir="ltr">
                              {v.contact_phone || '—'}
                            </span>
                            {v.contact_email ? (
                              <span className="t-caption block text-ink-3" dir="ltr">
                                {v.contact_email}
                              </span>
                            ) : null}
                          </TD>
                          <TD>
                            <span className="t-body-strong t-num text-ink">
                              {v.open_tickets}
                            </span>
                          </TD>
                          <TD>
                            <span className="t-meta t-num text-ink-2">
                              {v.avg_response_label || '—'}
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
                        {open ? (
                          <TR>
                            <td
                              colSpan={6}
                              className="bg-surface-sunken/40 px-0 align-middle"
                            >
                              <VendorExpand v={v} />
                            </td>
                          </TR>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function VendorExpand({ v }: { v: VendorRow }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <p className="t-caption mb-1.5 text-ink-3">היסטוריית שיגורים אחרונה</p>
        {v.recent.length === 0 ? (
          <p className="t-meta text-ink-3">אין שיגורים עדיין</p>
        ) : (
          <ul className="space-y-1.5">
            {v.recent.slice(0, 5).map((r) => (
              <li key={`${r.ticket_id}-${r.created_at}`} className="t-meta text-ink-2">
                <Link
                  href={`/ops/tickets/${r.ticket_id}`}
                  className="text-[var(--tenant)] hover:underline"
                >
                  {r.ticket_display || r.ticket_id.slice(0, 8)}
                </Link>
                <span className="t-caption t-num text-ink-3"> · {fmtShort(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <details className="t-caption text-ink-3">
        <summary className="cursor-pointer hover:text-ink-2">פרטים טכניים</summary>
        <dl className="mt-2 grid gap-1 sm:grid-cols-2">
          <div>
            <dt className="text-ink-3">HMAC</dt>
            <dd className="t-meta text-ink-2">{v.has_hmac ? 'מוגדר' : 'לא הוגדר'}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Webhook</dt>
            <dd className="t-meta truncate text-ink-2" dir="ltr">
              {v.webhook_url || '—'}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  )
}
