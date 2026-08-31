'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select } from '@/components/ui/input'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { WhatsAppShareButton } from '@/components/ui/whatsapp-share-button'
import { classifyFaultText } from '@/modules/tickets/classify'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
} from '@/modules/tickets/constants'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'
import { fileToCompressedDataUrl } from '@/lib/media/compress-image'
import { MEDIA_LIMITS, validateMediaFile } from '@/modules/tickets/media-limits'

type MediaItem = {
  id: string
  preview: string
  file: File
  kind: 'image' | 'video'
}

async function uploadTicketMedia(ticketId: string, items: MediaItem[]) {
  if (!items.length) return
  const form = new FormData()
  for (const item of items) {
    form.append('files', item.file)
  }
  const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'העלאת קבצים נכשלה')
  }
}

export function TicketReportForm({
  apiUrl,
  initialStore,
  stores,
  locked = false,
  showWhatsApp = true,
  mode = 'public',
  onCreated,
  onDismiss,
}: {
  apiUrl: '/api/report' | '/api/store/tickets' | '/api/tickets'
  initialStore: string
  stores: { code: string; name: string; id?: string }[]
  locked?: boolean
  showWhatsApp?: boolean
  /** HQ ops create — different success CTAs and source. */
  mode?: 'public' | 'ops'
  onCreated?: (ticket: { id: string; display_number: string | null }) => void
  onDismiss?: () => void
}) {
  const [storeCode, setStoreCode] = useState(initialStore)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [assetId, setAssetId] = useState('')
  const [assets, setAssets] = useState<{ id: string; code: string; name: string }[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
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

  useEffect(() => {
    if (!storeCode) {
      setAssets([])
      setAssetId('')
      return
    }
    let cancelled = false
    setAssetsLoading(true)
    void fetch(`/api/report/assets?storeCode=${encodeURIComponent(storeCode)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        setAssets(json.assets ?? [])
        setAssetId('')
      })
      .catch(() => {
        if (!cancelled) setAssets([])
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [storeCode])

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    const room = MEDIA_LIMITS.maxFiles - media.length
    if (room <= 0) return

    const picked = Array.from(files).slice(0, room)
    const next: MediaItem[] = []

    for (const file of picked) {
      const check = validateMediaFile(file)
      if (!check.ok) {
        setError(check.error)
        return
      }
      let preview = ''
      if (check.kind === 'image') {
        try {
          preview = await fileToCompressedDataUrl(file)
        } catch {
          setError('לא ניתן לעבד את התמונה')
          return
        }
      } else {
        preview = URL.createObjectURL(file)
      }
      next.push({
        id: `${file.name}-${file.lastModified}`,
        preview,
        file: check.kind === 'image'
          ? await dataUrlToFile(await fileToCompressedDataUrl(file), file.name)
          : file,
        kind: check.kind,
      })
    }

    setMedia((prev) => [...prev, ...next].slice(0, MEDIA_LIMITS.maxFiles))
    setError(null)
  }

  function removeMedia(id: string) {
    setMedia((prev) => prev.filter((p) => p.id !== id))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode,
          description,
          reporterName: name || undefined,
          reporterPhone: phone || undefined,
          category: category || undefined,
          assetId: assetId || undefined,
          ...(mode === 'ops' ? { source: 'web_fallback' as const } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      const id = json.ticket?.id as string
      const displayNumber = (json.ticket?.display_number as string | null) ?? null
      if (id && media.length) {
        await uploadTicketMedia(id, media)
      }
      setTicketId(id ?? null)
      setDisplay(displayNumber)
      if (id) onCreated?.({ id, display_number: displayNumber })
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
    setAssetId('')
    setMedia([])
    setError(null)
  }

  if (ticketId) {
    if (mode === 'ops') {
      return (
        <div className="space-y-4 text-center">
          <Notice tone="progress">
            התקלה נפתחה
            {display ? ` · ${display}` : ''}
          </Notice>
          <p className="t-body text-ink-2">אפשר לשייך טכנאי או להמשיך לטפל מהתור.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="primary" size="block">
              <a href={`/ops/tickets/${ticketId}`}>לצפייה בתקלה</a>
            </Button>
            <Button type="button" variant="secondary" size="block" onClick={resetForm}>
              תקלה נוספת
            </Button>
            {onDismiss ? (
              <Button type="button" variant="ghost" size="block" onClick={onDismiss}>
                סגירה
              </Button>
            ) : null}
          </div>
        </div>
      )
    }

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

      {!locked ? (
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
      ) : null}

      {showWhatsApp && storeCode ? (
        <WhatsAppShareButton
          prefillText={storeWhatsAppPrefill(storeCode)}
          label="דיווח ב-WhatsApp"
          variant="secondary"
          className="w-full"
        />
      ) : null}

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

      {assets.length > 0 || assetsLoading ? (
        <Field label="נכס / מיקום (אופציונלי)" htmlFor="report-asset">
          <Select
            id="report-asset"
            value={assetId}
            disabled={assetsLoading}
            onChange={(e) => setAssetId(e.target.value)}
          >
            <option value="">
              {assetsLoading ? 'טוען נכסים…' : 'ללא — כל החנות'}
            </option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="תמונות / סרטונים (אופציונלי)" htmlFor="report-media">
        <div className="space-y-2">
          {media.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {media.map((p) => (
                <li key={p.id} className="relative">
                  {p.kind === 'video' ? (
                    <video
                      src={p.preview}
                      className="h-16 w-16 rounded-[var(--radius-md)] border border-border object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.preview}
                      alt=""
                      className="h-16 w-16 rounded-[var(--radius-md)] border border-border object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(p.id)}
                    className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-surface"
                    aria-label="הסרת קובץ"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {media.length < MEDIA_LIMITS.maxFiles ? (
            <label className="flex min-h-[var(--tap)] cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-3 py-2 text-ink-2 transition-colors hover:border-[var(--tenant)] hover:text-ink">
              <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
              <span className="t-body">
                הוספת קובץ ({media.length}/{MEDIA_LIMITS.maxFiles})
              </span>
              <input
                id="report-media"
                type="file"
                accept="image/*,video/mp4,video/webm"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void onPickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          ) : null}
          <p className="t-caption text-ink-3">
            עד {MEDIA_LIMITS.maxFiles} קבצים · תמונה עד 5MB · סרטון MP4/WebM עד 15MB
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
    </form>
  )
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

function normalizeCategoryKey(raw: string): string {
  if (raw === 'electrical_hazard') return 'electrical'
  return raw
}
