import type {
  CapturedQuote,
  CaptureQuoteInput,
  CreateRfqDraftInput,
  QuoteCurrency,
  RfqDraft,
} from './types'

const CURRENCIES: QuoteCurrency[] = ['ILS', 'EUR', 'USD']

/**
 * Compose a Hebrew RFQ draft body from store / trade / tickets / docs / timing.
 * Does not invent prices or vendor quotes.
 */
export function composeRfqDraftBody(input: {
  storeLabel: string
  trade: string
  ticketLabels: string[]
  documentNotes: string[]
  timingNote: string | null
}): string {
  const lines: string[] = [
    'בקשת הצעת מחיר (טיוטה — לא נשלחה)',
    '',
    `סניף: ${input.storeLabel || '—'}`,
    `מקצוע / קטגוריה: ${input.trade || '—'}`,
  ]
  if (input.ticketLabels.length > 0) {
    lines.push('תקלות:')
    for (const t of input.ticketLabels) lines.push(`· ${t}`)
  }
  if (input.documentNotes.length > 0) {
    lines.push('מסמכים / חומר לצרף:')
    for (const d of input.documentNotes) lines.push(`· ${d}`)
  }
  if (input.timingNote?.trim()) {
    lines.push(`תזמון מבוקש: ${input.timingNote.trim()}`)
  }
  lines.push('')
  lines.push('נא להחזיר הצעה עם: מקור, תאריך, מטבע, מע״מ, תוקף.')
  lines.push('אין מחיר במערכת — רק מה שתקבלו בפועל ותזינו ידנית.')
  return lines.join('\n')
}

export function createRfqDraftRecord(
  input: CreateRfqDraftInput,
  now = new Date().toISOString(),
): RfqDraft {
  const trade = input.trade.trim()
  if (!trade) throw new Error('מקצוע / קטגוריה חובה')
  const ticketIds = [...new Set(input.ticket_ids.map((id) => id.trim()).filter(Boolean))]
  if (ticketIds.length === 0) throw new Error('נדרשת לפחות תקלה אחת')

  const documentNotes = (input.document_notes ?? [])
    .map((d) => d.trim())
    .filter(Boolean)
  const timing = input.timing_note?.trim() || null
  const storeLabel =
    [input.store_code ? `#${input.store_code}` : null, input.store_name]
      .filter(Boolean)
      .join(' · ') || '—'

  const body =
    input.body_text?.trim() ||
    composeRfqDraftBody({
      storeLabel,
      trade,
      ticketLabels: ticketIds.map((id) => id),
      documentNotes,
      timingNote: timing,
    })

  return {
    id: `rfq-${crypto.randomUUID()}`,
    status: 'draft',
    store_id: input.store_id ?? null,
    store_code: input.store_code ?? null,
    store_name: input.store_name ?? null,
    trade,
    ticket_ids: ticketIds,
    document_notes: documentNotes,
    timing_note: timing,
    body_text: body,
    recipient_hints: (input.recipient_hints ?? []).map((r) => r.trim()).filter(Boolean),
    quotes: [],
    created_at: now,
    updated_at: now,
    created_by: input.created_by ?? null,
  }
}

/**
 * Manual quote capture. Amount is optional; when provided must be a finite
 * non-negative number entered by the user — never scraped or invented.
 */
export function captureQuoteRecord(
  input: CaptureQuoteInput,
  now = new Date().toISOString(),
): CapturedQuote {
  const source = input.source.trim()
  if (!source) throw new Error('מקור ההצעה חובה')
  const quotedAt = input.quoted_at.trim()
  if (!quotedAt) throw new Error('תאריך ההצעה חובה')

  const currency = input.currency ?? 'ILS'
  if (!CURRENCIES.includes(currency)) {
    throw new Error('מטבע לא נתמך')
  }

  let amount: number | null = null
  if (input.amount != null && input.amount !== ('' as unknown)) {
    const n = Number(input.amount)
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('סכום לא תקין — הזינו מספר ≥ 0 או השאירו ריק')
    }
    amount = n
  }

  return {
    id: `quote-${crypto.randomUUID()}`,
    source,
    quoted_at: quotedAt,
    currency,
    amount,
    vat_included:
      input.vat_included === undefined ? null : Boolean(input.vat_included),
    valid_until: input.valid_until?.trim() || null,
    notes: input.notes?.trim() || null,
    captured_at: now,
  }
}

/** Policy guard — drafts never leave `draft`; no send helpers. */
export function assertDraftOnly(draft: RfqDraft): void {
  if (draft.status !== 'draft') {
    throw new Error('RFQ נשלח אוטומטית אסור במדיניות C07')
  }
}
