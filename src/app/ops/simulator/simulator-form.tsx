'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Panel, PanelHeader, EmptyState } from '@/components/ui/primitives'
import { LiveRegion } from '@/components/ui/a11y'
import { cn } from '@/lib/utils'

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
  const [source, setSource] =
    useState<(typeof SOURCES)[number]['value']>('qr_whatsapp')
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
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
          <Field label="מספר שולח (wa_id)" htmlFor="sim-wa">
            <Input
              id="sim-wa"
              dir="ltr"
              required
              className="t-num"
              value={waId}
              onChange={(e) => setWaId(e.target.value)}
            />
          </Field>

          <Field
            label="קוד חנות"
            htmlFor="sim-store"
            hint="אם ממולא — נשלח כ־STORE_קוד, כמו סריקת QR או NFC"
          >
            <Input
              id="sim-store"
              dir="ltr"
              placeholder="172"
              className="t-num"
              value={storeCode}
              onChange={(e) =>
                setStoreCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </Field>

          <Field label="טקסט ההודעה" htmlFor="sim-text">
            <Textarea
              id="sim-text"
              rows={3}
              placeholder="למשל: המזגן לא מקרר באזור הקופות"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>

          <Field label="מקור" htmlFor="sim-source">
            <Select
              id="sim-source"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? 'שולח…' : 'שליחת הודעה'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                send({
                  wa_id: waId,
                  store_code: storeCode || '172',
                  text: null,
                  source,
                })
              }
            >
              זיהוי חנות בלבד
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
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
      </Panel>

      <Panel flush className="overflow-hidden">
        <PanelHeader title="תשובות הבוט" meta={log.length ? `${log.length}` : undefined} />
        {log.length === 0 ? (
          <EmptyState
            title="עדיין אין הודעות"
            description="שלחו דיווח לדוגמה כדי לראות את תגובת ה־intake."
          />
        ) : (
          <LiveRegion>
          <ul aria-live="polite" className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {log.map((item, i) => (
              <li
                key={`${i}-${item.display_number ?? item.state ?? 'r'}`}
                className="px-4 py-3"
              >
                <div className="t-caption flex flex-wrap items-center gap-2 text-ink-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      item.ok
                        ? 'text-[var(--signal-resolved)]'
                        : 'text-[var(--signal-critical)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        item.ok
                          ? 'bg-[var(--signal-resolved)]'
                          : 'bg-[var(--signal-critical)]',
                      )}
                    />
                    {item.ok ? 'הצלחה' : 'שגיאה'}
                  </span>
                  {item.state ? <span>· {item.state}</span> : null}
                  {item.display_number ? (
                    <span className="t-num">· {item.display_number}</span>
                  ) : null}
                  {item.ticket_id ? (
                    <Link
                      href={`/ops/tickets/${item.ticket_id}`}
                      className="text-[var(--tenant)] hover:underline"
                    >
                      · צפייה בתקלה
                    </Link>
                  ) : null}
                  {item.duplicate ? <span>· כפילות</span> : null}
                </div>
                <p className="t-body mt-1 whitespace-pre-wrap text-ink">
                  {item.reply || item.error || '—'}
                </p>
              </li>
            ))}
          </ul>
          </LiveRegion>
        )}
      </Panel>
    </div>
  )
}
