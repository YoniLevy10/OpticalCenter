'use client'

import { useState, useTransition } from 'react'

type SimResult = {
  ok: boolean
  duplicate?: boolean
  reply: string | null
  ticket_id?: string | null
  display_number?: string | null
  state?: string | null
  error?: string | null
}

const SOURCES = [
  { value: 'qr_whatsapp', label: 'QR → WhatsApp' },
  { value: 'nfc_whatsapp', label: 'NFC → WhatsApp' },
  { value: 'whatsapp', label: 'ידני (WhatsApp)' },
] as const

export function SimulatorForm() {
  const [waId, setWaId] = useState('972501234567')
  const [storeCode, setStoreCode] = useState('172')
  const [text, setText] = useState('')
  const [source, setSource] = useState<(typeof SOURCES)[number]['value']>('qr_whatsapp')
  const [log, setLog] = useState<SimResult[]>([])
  const [pending, startTransition] = useTransition()

  function send(payload: {
    wa_id: string
    text?: string | null
    store_code?: string | null
    source?: string
  }) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/demo/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = (await res.json()) as SimResult
        setLog((prev) => [data, ...prev].slice(0, 12))
        if (data.ok && data.state === 'awaiting_description') {
          setText('')
        }
        if (data.ok && data.state === 'done') {
          setText('')
        }
      } catch (e) {
        setLog((prev) => [
          {
            ok: false,
            reply: null,
            error: e instanceof Error ? e.message : 'שגיאת רשת',
          },
          ...prev,
        ])
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault()
          send({
            wa_id: waId,
            text: text.trim() || null,
            store_code: storeCode.trim() || null,
            source,
          })
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">מספר שולח (wa_id)</label>
          <input
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm tabular-nums"
            value={waId}
            onChange={(e) => setWaId(e.target.value)}
            dir="ltr"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">קוד חנות (אופציונלי)</label>
          <input
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm tabular-nums"
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="172"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-zinc-500">
            אם ממולא — נשלח כ־STORE_קוד (כמו סריקת QR/NFC). השאירו ריק לשיחה ידנית.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">טקסט הודעה</label>
          <textarea
            className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="למשל: המזגן לא מקרר באזור הקופות"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">מקור</label>
          <select
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? 'שולח…' : 'שלח הודעה'}
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() =>
              send({
                wa_id: waId,
                store_code: storeCode || '172',
                text: null,
                source,
              })
            }
          >
            רק זיהוי חנות (STORE_)
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => {
              setStoreCode('')
              send({
                wa_id: waId,
                store_code: null,
                text: text.trim() || 'שלום',
                source: 'whatsapp',
              })
            }}
          >
            בלי קוד חנות
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3 text-sm font-medium">תשובות הבוט</div>
        <ul className="max-h-[480px] space-y-3 overflow-y-auto px-4 py-4 text-sm">
          {log.length === 0 ? (
            <li className="text-zinc-500">עדיין אין הודעות. שלחו דיווח לדוגמה.</li>
          ) : (
            log.map((item, i) => (
              <li
                key={`${i}-${item.display_number ?? item.state ?? 'r'}`}
                className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
              >
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>{item.ok ? 'הצלחה' : 'שגיאה'}</span>
                  {item.state ? <span>· מצב: {item.state}</span> : null}
                  {item.display_number ? <span>· {item.display_number}</span> : null}
                  {item.duplicate ? <span>· כפילות</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-zinc-800">
                  {item.reply || item.error || '—'}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
