'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { classifyFaultText } from '@/modules/tickets/classify'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
} from '@/modules/tickets/constants'
import { fileToCompressedDataUrl } from '@/lib/media/compress-image'

const MAX_PHOTOS = 3

export function PublicReportForm({
  initialStore,
  stores,
}: {
  initialStore: string
  stores: { code: string; name: string }[]
}) {
  const [storeCode, setStoreCode] = useState(initialStore)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [photos, setPhotos] = useState<{ id: string; preview: string; dataUrl: string }[]>(
    [],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [display, setDisplay] = useState<string | null>(null)

  const classified = useMemo(() => {
    if (!description.trim()) return null
    return classifyFaultText(description)
  }, [description])

  const effectiveCategory = category || classified?.category || 'other'
  const categoryLabel =
    TICKET_CATEGORY_LABELS_HE[normalizeCategoryKey(effectiveCategory)] ?? 'אחר'

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) return

    const picked = Array.from(files).slice(0, room)
    const next: typeof photos = []

    for (const file of picked) {
      try {
        const dataUrl = await fileToCompressedDataUrl(file)
        next.push({
          id: `${file.name}-${file.lastModified}`,
          preview: dataUrl,
          dataUrl,
        })
      } catch {
        setError('לא ניתן לעבד את התמונה — נסו קובץ JPG/PNG קטן יותר')
        return
      }
    }

    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS))
    setError(null)
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode,
          description,
          reporterName: name || undefined,
          reporterPhone: phone || undefined,
          category: category || undefined,
          photos: photos.map((p) => p.dataUrl),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      setTicketId(json.ticket?.id ?? null)
      setDisplay(json.ticket?.display_number ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  function resetForm() {
    setTicketId(null)
    setDisplay(null)
    setDescription('')
    setName('')
    setPhone('')
    setCategory('')
    setPhotos([])
    setError(null)
  }

  if (ticketId) {
    return (
      <div className="space-y-4 text-center">
        <Notice tone="progress">
          הדיווח התקבל
          {display ? ` · ${display}` : ''}
        </Notice>
        <p className="t-body text-ink-2">
          צוות התחזוקה יטפל בתקלה.
          {phone.trim()
            ? ' תקבלו עדכון ב-WhatsApp כשהטיפול יתקדם.'
            : ' אפשר לסגור את החלון.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="primary" size="block" onClick={resetForm}>
            דיווח נוסף
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="block"
            onClick={() => window.close()}
          >
            סגירה
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}

      <Field label="חנות" htmlFor="report-store">
        <Select
          id="report-store"
          required
          value={storeCode}
          onChange={(e) => setStoreCode(e.target.value)}
        >
          <option value="">בחרו חנות…</option>
          {stores.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} · {s.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="תיאור התקלה" htmlFor="report-desc">
        <Textarea
          id="report-desc"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="לדוגמה: מזגן לא מקרר / נזילה ליד הדלפק"
        />
      </Field>

      {classified ? (
        <p className="t-caption text-ink-3">
          סיווג מוצע: {categoryLabel}
          {' · '}
          עדיפות {TICKET_PRIORITY_LABELS_HE[classified.priority]}
        </p>
      ) : null}

      <Field label="קטגוריה (אופציונלי)" htmlFor="report-category">
        <Select
          id="report-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">זיהוי אוטומטי מהתיאור</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TICKET_CATEGORY_LABELS_HE[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="תמונות (אופציונלי)" htmlFor="report-photos">
        <div className="space-y-2">
          {photos.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <li key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.preview}
                    alt=""
                    className="h-16 w-16 rounded-[var(--radius-md)] border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-surface"
                    aria-label="הסרת תמונה"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {photos.length < MAX_PHOTOS ? (
            <label className="flex min-h-[var(--tap)] cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-2 text-ink-2 transition-colors hover:border-[var(--tenant)] hover:text-ink">
              <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
              <span className="t-body">
                הוספת תמונה ({photos.length}/{MAX_PHOTOS})
              </span>
              <input
                id="report-photos"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void onPickPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          ) : null}
          <p className="t-caption text-ink-3">
            עד {MAX_PHOTOS} תמונות — עוזר לצוות להבין את התקלה.
          </p>
        </div>
      </Field>

      <Field label="שם (אופציונלי)" htmlFor="report-name">
        <Input
          id="report-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם מדווח"
        />
      </Field>

      <Field label="טלפון (אופציונלי)" htmlFor="report-phone">
        <Input
          id="report-phone"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05…"
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="block"
        disabled={busy || !storeCode || !description.trim()}
      >
        {busy ? 'שולח…' : 'שליחת דיווח'}
      </Button>

      <p className="t-caption text-center text-ink-3">
        עדיף לדווח דרך WhatsApp אחרי סריקת QR בחנות. טופס זה הוא גיבוי.
      </p>
    </form>
  )
}

function normalizeCategoryKey(raw: string): string {
  if (raw === 'electrical_hazard') return 'electrical'
  return raw
}
