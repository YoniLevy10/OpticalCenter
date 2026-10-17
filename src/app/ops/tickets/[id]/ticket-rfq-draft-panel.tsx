'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Notice, Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import type { CapturedQuote, RfqDraft } from '@/modules/rfq/types'

/**
 * C07 — RFQ draft (store / trade / tickets / docs / timing) + optional
 * manual quote capture. Never auto-sends. Never invents prices.
 */
export function TicketRfqDraftPanel({
  ticketId,
  ticketLabel,
  storeId,
  storeCode,
  storeName,
  trade,
}: {
  ticketId: string
  ticketLabel: string
  storeId: string
  storeCode: string
  storeName: string
  trade: string
}) {
  const toast = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<RfqDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [docs, setDocs] = useState('')
  const [timing, setTiming] = useState('')
  const [recipients, setRecipients] = useState('')

  const [quoteDraftId, setQuoteDraftId] = useState<string | null>(null)
  const [qSource, setQSource] = useState('')
  const [qDate, setQDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [qCurrency, setQCurrency] = useState<'ILS' | 'EUR' | 'USD'>('ILS')
  const [qAmount, setQAmount] = useState('')
  const [qVat, setQVat] = useState<'yes' | 'no' | 'unknown'>('unknown')
  const [qValid, setQValid] = useState('')
  const [qNotes, setQNotes] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/rfq/drafts?ticketId=${encodeURIComponent(ticketId)}`,
      )
      const json = await res.json()
      if (res.ok) setDrafts(json.drafts ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ticket-scoped once
  }, [ticketId])

  async function createDraft() {
    setBusy(true)
    try {
      const document_notes = docs
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const recipient_hints = recipients
        .split(/[,|\n]/)
        .map((l) => l.trim())
        .filter(Boolean)
      const res = await fetch('/api/rfq/drafts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId || null,
          store_code: storeCode || null,
          store_name: storeName || null,
          trade: trade || 'other',
          ticket_ids: [ticketId],
          document_notes,
          timing_note: timing.trim() || null,
          recipient_hints,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירת טיוטה נכשלה')
      toast.push({
        title: 'טיוטת הצעה נשמרה — לא נשלחה',
        tone: 'success',
      })
      setDocs('')
      setTiming('')
      setRecipients('')
      await reload()
      startTransition(() => router.refresh())
    } catch (e) {
      toast.push({
        title: e instanceof Error ? e.message : 'שגיאה',
        tone: 'critical',
      })
    } finally {
      setBusy(false)
    }
  }

  async function copyBody(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.push({ title: 'הטיוטה הועתקה — שליחה ידנית בלבד', tone: 'success' })
    } catch {
      toast.push({ title: 'העתקה נכשלה', tone: 'critical' })
    }
  }

  async function captureQuote() {
    if (!quoteDraftId) return
    setBusy(true)
    try {
      const amountRaw = qAmount.trim()
      const amount =
        amountRaw === ''
          ? null
          : Number(amountRaw.replace(/,/g, ''))
      if (amountRaw !== '' && (!Number.isFinite(amount) || (amount ?? 0) < 0)) {
        throw new Error('סכום לא תקין — השאירו ריק או הזינו מספר ≥ 0')
      }
      const res = await fetch(`/api/rfq/drafts/${quoteDraftId}/quotes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: qSource.trim(),
          quoted_at: qDate,
          currency: qCurrency,
          amount,
          vat_included:
            qVat === 'unknown' ? null : qVat === 'yes',
          valid_until: qValid.trim() || null,
          notes: qNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שמירת הצעה נכשלה')
      toast.push({ title: 'הצעה אמיתית נשמרה ידנית', tone: 'success' })
      setQSource('')
      setQAmount('')
      setQNotes('')
      setQValid('')
      setQuoteDraftId(null)
      await reload()
    } catch (e) {
      toast.push({
        title: e instanceof Error ? e.message : 'שגיאה',
        tone: 'critical',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel elevated className="space-y-4" data-visual="rfq-draft">
      <div>
        <h2 className="t-body-strong text-ink">טיוטת בקשת הצעת מחיר</h2>
        <p className="t-meta mt-1 text-ink-2">
          סניף, מקצוע, תקלות, מסמכים ותזמון — לשמירה והעתקה ידנית בלבד.
          אין שליחה אוטומטית לספקים. מחירים רק אם הזנתם הצעה שקיבלתם בפועל.
        </p>
        <Notice tone="warning">
          מדיניות: בלי גרידת מידרג · בלי שליחה אוטומטית · בלי מחיר מדומה
        </Notice>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 px-3 py-2">
          <p className="t-caption text-ink-3">סניף</p>
          <p className="t-body text-ink">
            {storeCode ? `#${storeCode}` : '—'}
            {storeName ? ` · ${storeName}` : ''}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 px-3 py-2">
          <p className="t-caption text-ink-3">מקצוע / קטגוריה</p>
          <p className="t-body text-ink">{trade || '—'}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 px-3 py-2 sm:col-span-2">
          <p className="t-caption text-ink-3">תקלה</p>
          <p className="t-body text-ink">{ticketLabel}</p>
        </div>
      </div>

      <Field label="מסמכים לצירוף (שורה לכל פריט)" htmlFor="rfq-docs">
        <Textarea
          id="rfq-docs"
          rows={2}
          value={docs}
          onChange={(e) => setDocs(e.target.value)}
          placeholder="לדוגמה: חוזה שירות · תמונת נזילה"
          disabled={busy}
        />
      </Field>
      <Field label="תזמון מבוקש" htmlFor="rfq-timing">
        <Input
          id="rfq-timing"
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
          placeholder="לדוגמה: עד יום חמישי · בוקר בלבד"
          disabled={busy}
        />
      </Field>
      <Field
        label="נמענים להעתקה ידנית (אופציונלי)"
        htmlFor="rfq-recipients"
        hint="שמות או טלפונים — לא נשלח אוטומטית"
      >
        <Input
          id="rfq-recipients"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="אורי כהן, 050-…"
          disabled={busy}
        />
      </Field>

      <Button
        type="button"
        variant="secondary"
        size="touch"
        disabled={busy}
        onClick={() => void createDraft()}
      >
        {busy ? 'שומר…' : 'שמור טיוטה (בלי שליחה)'}
      </Button>

      {loading ? (
        <p className="t-body text-ink-2">טוען טיוטות…</p>
      ) : drafts.length === 0 ? (
        <Notice tone="neutral">אין עדיין טיוטה לתקלה זו.</Notice>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="rounded-[var(--radius-md)] border border-border p-3"
              data-rfq-id={d.id}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="t-caption rounded-[var(--radius-sm)] bg-surface-sunken px-1.5 py-0.5 text-ink-2">
                  טיוטה
                </span>
                <span className="t-meta text-ink-3">
                  עודכן {new Date(d.updated_at).toLocaleString('he-IL')}
                </span>
              </div>
              <pre className="t-meta mb-3 whitespace-pre-wrap rounded-[var(--radius-sm)] bg-surface-sunken/50 p-2 text-ink-2">
                {d.body_text}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyBody(d.body_text)}
                >
                  העתק טיוטה
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setQuoteDraftId((cur) => (cur === d.id ? null : d.id))
                  }
                >
                  {quoteDraftId === d.id
                    ? 'סגור הזנת הצעה'
                    : 'הזן הצעה שקיבלתם'}
                </Button>
              </div>

              {d.quotes.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-border pt-3">
                  {d.quotes.map((q) => (
                    <QuoteRow key={q.id} quote={q} />
                  ))}
                </ul>
              ) : (
                <p className="t-meta mt-2 text-ink-3">
                  אין הצעות שמורות — אין מחיר מדומה במערכת.
                </p>
              )}

              {quoteDraftId === d.id ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <p className="t-caption text-ink-2">
                    הצעה אמיתית בלבד — סכום אופציונלי, רק אם קיבלתם בפועל.
                  </p>
                  <Field label="מקור" htmlFor={`q-src-${d.id}`}>
                    <Input
                      id={`q-src-${d.id}`}
                      value={qSource}
                      onChange={(e) => setQSource(e.target.value)}
                      placeholder="שם ספק / מידרג / טלפון"
                    />
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="תאריך" htmlFor={`q-date-${d.id}`}>
                      <Input
                        id={`q-date-${d.id}`}
                        type="date"
                        value={qDate}
                        onChange={(e) => setQDate(e.target.value)}
                      />
                    </Field>
                    <Field label="מטבע" htmlFor={`q-cur-${d.id}`}>
                      <select
                        id={`q-cur-${d.id}`}
                        className="t-control w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2"
                        value={qCurrency}
                        onChange={(e) =>
                          setQCurrency(e.target.value as 'ILS' | 'EUR' | 'USD')
                        }
                      >
                        <option value="ILS">ILS</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </Field>
                    <Field
                      label="סכום (אופציונלי)"
                      htmlFor={`q-amt-${d.id}`}
                      hint="ריק = בלי מחיר"
                    >
                      <Input
                        id={`q-amt-${d.id}`}
                        inputMode="decimal"
                        value={qAmount}
                        onChange={(e) => setQAmount(e.target.value)}
                        placeholder="—"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="מע״מ" htmlFor={`q-vat-${d.id}`}>
                      <select
                        id={`q-vat-${d.id}`}
                        className="t-control w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2"
                        value={qVat}
                        onChange={(e) =>
                          setQVat(e.target.value as 'yes' | 'no' | 'unknown')
                        }
                      >
                        <option value="unknown">לא צוין</option>
                        <option value="yes">כולל מע״מ</option>
                        <option value="no">לפני מע״מ</option>
                      </select>
                    </Field>
                    <Field label="תוקף עד" htmlFor={`q-valid-${d.id}`}>
                      <Input
                        id={`q-valid-${d.id}`}
                        type="date"
                        value={qValid}
                        onChange={(e) => setQValid(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="הערות" htmlFor={`q-notes-${d.id}`}>
                    <Input
                      id={`q-notes-${d.id}`}
                      value={qNotes}
                      onChange={(e) => setQNotes(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="primary"
                    size="touch"
                    disabled={busy || !qSource.trim() || !qDate}
                    onClick={() => void captureQuote()}
                  >
                    שמור הצעה ידנית
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function QuoteRow({ quote }: { quote: CapturedQuote }) {
  const amountLabel =
    quote.amount == null
      ? 'בלי סכום'
      : `${quote.amount.toLocaleString('he-IL')} ${quote.currency}`
  const vat =
    quote.vat_included == null
      ? 'מע״מ לא צוין'
      : quote.vat_included
        ? 'כולל מע״מ'
        : 'לפני מע״מ'
  return (
    <li className="t-meta text-ink-2">
      <span className="t-body-strong text-ink">{quote.source}</span>
      {' · '}
      {quote.quoted_at}
      {' · '}
      {amountLabel}
      {' · '}
      {vat}
      {quote.valid_until ? ` · תוקף עד ${quote.valid_until}` : ''}
      {quote.notes ? ` · ${quote.notes}` : ''}
    </li>
  )
}
