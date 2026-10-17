'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'

export type VisitConfirmTicket = {
  id: string
  label: string
  title?: string
  spendBlock?: string | null
}

export type VisitConfirmVendor = { id: string; name: string }

export type VisitItemResult = {
  ticket_id: string
  display_number: string | null
  status: string
  error: string | null
  can_retry: boolean
}

export type VisitResult = {
  id: string
  status: string
  items: VisitItemResult[]
}

function statusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'נשלח לספק'
    case 'labeled':
      return 'סומן לשיבוץ (אין ערוץ חי)'
    case 'ack':
      return 'אושר ע״י ספק'
    case 'failed':
      return 'נכשל'
    case 'blocked':
      return 'חסום — נדרש אישור'
    case 'queued':
      return 'בתור'
    case 'partial':
      return 'חלקי'
    case 'dispatched':
      return 'שובץ'
    default:
      return status
  }
}

function statusTone(status: string): string {
  if (status === 'sent' || status === 'ack' || status === 'dispatched') {
    return 'text-[var(--signal-success)]'
  }
  if (status === 'labeled') return 'text-[var(--signal-warning)]'
  if (status === 'failed' || status === 'blocked' || status === 'partial') {
    return 'text-[var(--signal-critical)]'
  }
  return 'text-ink-2'
}

export function VisitConfirmSheet({
  open,
  onOpenChange,
  title,
  storeLabel,
  tickets,
  vendors,
  vendorId,
  onVendorIdChange,
  notes,
  onNotesChange,
  scheduledAt,
  onScheduledAtChange,
  busy,
  canSubmit,
  result,
  onSubmit,
  onRetryFailed,
  onRetryTicket,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  storeLabel: string
  tickets: VisitConfirmTicket[]
  vendors: VisitConfirmVendor[]
  vendorId: string
  onVendorIdChange: (id: string) => void
  notes: string
  onNotesChange: (v: string) => void
  scheduledAt: string
  onScheduledAtChange: (v: string) => void
  busy: boolean
  canSubmit: boolean
  result: VisitResult | null
  onSubmit: () => void
  onRetryFailed: () => void
  onRetryTicket: (ticketId: string) => void
}) {
  const approvalNeeds = useMemo(
    () => tickets.filter((t) => Boolean(t.spendBlock)),
    [tickets],
  )
  const vendorName =
    vendors.find((v) => v.id === vendorId)?.name ?? '—'
  const failed = result?.items.filter((i) => i.can_retry) ?? []

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        result
          ? `תוצאה · ${statusLabel(result.status)}`
          : `${storeLabel} · ${tickets.length} תקלות`
      }
    >
      <div className="flex flex-col gap-4">
        {!result ? (
          <>
            <dl className="t-caption grid gap-2 text-ink-2">
              <div className="flex justify-between gap-3">
                <dt>חנות</dt>
                <dd className="font-semibold text-ink">{storeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>מספר תקלות</dt>
                <dd className="t-num font-semibold text-ink">
                  {tickets.length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>ספק</dt>
                <dd className="font-semibold text-ink">{vendorName || '—'}</dd>
              </div>
            </dl>

            <ul className="t-caption max-h-36 space-y-1 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface-sunken/30 px-3 py-2 text-ink-2">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-col gap-0.5">
                  <span className="font-semibold text-ink">{t.label}</span>
                  {t.title ? (
                    <span className="line-clamp-1">{t.title}</span>
                  ) : null}
                  {t.spendBlock ? (
                    <span className="text-[var(--signal-critical)]">
                      {t.spendBlock}
                    </span>
                  ) : (
                    <span className="text-[var(--signal-success)]">
                      אישור הוצאה תקין
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {approvalNeeds.length > 0 ? (
              <p className="t-body text-[var(--signal-critical)]">
                {approvalNeeds.length} תקלות ממתינות לאישור הוצאה — השיגור
                ייחסם עבורן
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-ink-2">ספק / בעל מקצוע</span>
              <select
                className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
                value={vendorId}
                onChange={(e) => onVendorIdChange(e.target.value)}
                disabled={busy}
              >
                {vendors.length === 0 ? (
                  <option value="">אין ספקים פעילים</option>
                ) : (
                  vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-ink-2">מועד מתוכנן (אופציונלי)</span>
              <input
                type="datetime-local"
                className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
                value={scheduledAt}
                onChange={(e) => onScheduledAtChange(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="t-caption text-ink-2">הערה (אופציונלי)</span>
              <textarea
                className="t-control min-h-[5rem] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-ink"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                disabled={busy}
                placeholder="תיאום ביקור, שעת הגעה…"
              />
            </label>

            <Button
              type="button"
              variant="primary"
              size="touch"
              className="w-full"
              disabled={busy || !canSubmit || !vendorId}
              onClick={onSubmit}
            >
              {busy ? 'שולח…' : 'אישור שיגור'}
            </Button>
          </>
        ) : (
          <>
            <p className={`t-body font-semibold ${statusTone(result.status)}`}>
              {statusLabel(result.status)}
              {result.status === 'partial'
                ? ' — חלק מהתקלות לא שוגרו'
                : null}
            </p>
            <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
              {result.items.map((item) => (
                <li
                  key={item.ticket_id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="t-caption t-num font-semibold text-ink">
                      {item.display_number || item.ticket_id.slice(0, 8)}
                    </p>
                    <p className={`t-caption ${statusTone(item.status)}`}>
                      {statusLabel(item.status)}
                    </p>
                    {item.error ? (
                      <p className="t-caption text-[var(--signal-critical)]">
                        {item.error}
                      </p>
                    ) : null}
                  </div>
                  {item.can_retry ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => onRetryTicket(item.ticket_id)}
                    >
                      נסה שוב
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {failed.length > 0 ? (
              <Button
                type="button"
                variant="primary"
                size="touch"
                className="w-full"
                disabled={busy}
                onClick={onRetryFailed}
              >
                נסה שוב את הכושלים ({failed.length})
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="touch"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                סגור
              </Button>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  )
}

/** Stable client idempotency key for a visit selection (survives double-click). */
export function buildVisitIdempotencyKey(input: {
  storeId: string
  vendorId: string
  ticketIds: string[]
}): string {
  const tickets = [...input.ticketIds].sort().join(',')
  return `visit-client:${input.storeId}:${input.vendorId}:${tickets}`
}

export function scheduledAtToIso(localValue: string): string | null {
  if (!localValue.trim()) return null
  const d = new Date(localValue)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Keep one in-flight submit; ignore extra clicks while pending. */
export function useSubmitGuard() {
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      await fn()
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return { busy, run }
}
