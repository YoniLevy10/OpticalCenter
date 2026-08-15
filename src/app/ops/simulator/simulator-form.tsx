'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Card } from '@/components/ui/primitives'

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
        if (data.ok && (data.state === 'awaiting_description' || data.state === 'done')) {
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
      <Card className="p-4">
        <form
          className="space-y-4"
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
            <label className="mb-1 block text-[12px] font-medium text-muted">
              מספר שולח (wa_id)
            </label>
            <Input
              value={waId}
              onChange={(e) => setWaId(e.target.value)}
              dir="ltr"
              required
              className="tabular-nums"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted">
              קוד חנות (אופציונלי)
            </label>
            <Input
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="172"
              dir="ltr"
              className="tabular-nums"
            />
            <p className="mt-1 text-[12px] text-faint">
              אם ממולא — נשלח כ־STORE_קוד (כמו סריקת QR/NFC). השאירו ריק לשיחה ידנית.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted">טקסט הודעה</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="למשל: המזגן לא מקרר באזור הקופות"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted">מקור</label>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="submit" variant="primary" size="lg" disabled={pending} className="sm:w-auto">
              {pending ? 'שולח…' : 'שלח הודעה'}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={pending}
              className="sm:w-auto"
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
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={pending}
              className="sm:w-auto"
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
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3 text-[14px] font-medium">
          תשובות הבוט
        </div>
        <ul className="max-h-[480px] space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
          {log.length === 0 ? (
            <li className="text-muted">עדיין אין הודעות. שלחו דיווח לדוגמה.</li>
          ) : (
            log.map((item, i) => (
              <li
                key={`${i}-${item.display_number ?? item.state ?? 'r'}`}
                className="rounded-[var(--radius-md)] border border-border bg-canvas px-3 py-2"
              >
                <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-faint">
                  <span>{item.ok ? 'הצלחה' : 'שגיאה'}</span>
                  {item.state ? <span>· מצב: {item.state}</span> : null}
                  {item.display_number ? <span>· {item.display_number}</span> : null}
                  {item.duplicate ? <span>· כפילות</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-foreground">
                  {item.reply || item.error || '—'}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  )
}
