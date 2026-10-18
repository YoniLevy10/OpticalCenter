/** C07 — RFQ draft + manually captured quotes. Never auto-send; never invent prices. */

export type RfqDraftStatus = 'draft'

export type QuoteCurrency = 'ILS' | 'EUR' | 'USD'

export type CapturedQuote = {
  id: string
  /** Who gave the quote (vendor name, Midrag contact, phone, email). */
  source: string
  /** Calendar date the quote was received (ISO date or datetime). */
  quoted_at: string
  currency: QuoteCurrency
  /**
   * Amount as entered by ops — null when only metadata was captured.
   * Never invent or scrape a price.
   */
  amount: number | null
  vat_included: boolean | null
  /** Validity end date if known. */
  valid_until: string | null
  notes: string | null
  captured_at: string
}

export type RfqDraft = {
  id: string
  status: RfqDraftStatus
  store_id: string | null
  store_code: string | null
  store_name: string | null
  /** Trade / category for the request. */
  trade: string
  ticket_ids: string[]
  /** Free-text refs to docs to attach when sending manually. */
  document_notes: string[]
  /** Timing / urgency for the vendor (e.g. "עד יום ה'"). */
  timing_note: string | null
  /** Composed outreach body — copy/paste only; no auto-send. */
  body_text: string
  /** Optional recipient hints for the human who will send. */
  recipient_hints: string[]
  quotes: CapturedQuote[]
  created_at: string
  updated_at: string
  created_by: string | null
}

export type CreateRfqDraftInput = {
  store_id?: string | null
  store_code?: string | null
  store_name?: string | null
  trade: string
  ticket_ids: string[]
  document_notes?: string[]
  timing_note?: string | null
  recipient_hints?: string[]
  body_text?: string | null
  created_by?: string | null
}

export type CaptureQuoteInput = {
  source: string
  quoted_at: string
  currency?: QuoteCurrency
  amount?: number | null
  vat_included?: boolean | null
  valid_until?: string | null
  notes?: string | null
}
