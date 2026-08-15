'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Camera, ImagePlus, Link2, X } from 'lucide-react'
import { TICKET_STATUS_LABELS_HE, type TicketStatus } from '@/modules/tickets/constants'
import { nextStatusActions } from '@/modules/tickets/tech'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxEdge = 960
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.72)
}

export function TechTicketActions({
  ticketId,
  techId,
  status,
  assignedTo,
}: {
  ticketId: string
  techId: string | null
  status: string
  assignedTo: string | null
}) {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const canAct = Boolean(techId)
  const isMine = Boolean(techId && assignedTo === techId)
  const isUnassigned = !assignedTo
  const actions = nextStatusActions(status)

  async function onPick(file: File | null) {
    if (!file) return
    setError(null)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      if (dataUrl.length > 280_000) {
        setError('התמונה גדולה מדי — נסו לצלם מחדש או לשלוח קישור')
        return
      }
      setPhotoUrl(dataUrl)
      setPreview(dataUrl)
      setShowUrl(false)
    } catch {
      setError('לא ניתן לקרוא את התמונה')
    }
  }

  function clearPhoto() {
    setPhotoUrl('')
    setPreview(null)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  async function submit(body: Record<string, unknown>) {
    if (!techId) {
      setError('חסר techId')
      return
    }
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/tech/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techId,
          note: note.trim() || undefined,
          resolution_note: note.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          ...body,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'העדכון נכשל')
        return
      }
      setMessage('נשמר בהצלחה')
      setNote('')
      clearPhoto()
      startTransition(() => router.refresh())
    } catch {
      setError('שגיאת רשת')
    }
  }

  return (
    <div className="space-y-4">
      {!canAct ? (
        <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          כדי לעדכן סטטוס הוסיפו <code className="text-[12px]">?techId=...</code> לכתובת.
        </p>
      ) : null}

      {isUnassigned && canAct ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={pending}
          onClick={() => void submit({ claim: true })}
        >
          תפיסת עבודה
        </Button>
      ) : null}

      {(isMine || isUnassigned) && actions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-muted">עדכון סטטוס</p>
          <div className="flex flex-col gap-2">
            {actions.map((next) => (
              <Button
                key={next}
                type="button"
                size="lg"
                variant={next === 'resolved' ? 'primary' : 'default'}
                disabled={pending || !canAct}
                onClick={() =>
                  void submit({ status: next, claim: isUnassigned ? true : undefined })
                }
              >
                {statusActionLabel(status as TicketStatus, next)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {status === 'resolved' ? (
        <p className="text-[13px] text-success">העבודה סומנה כהושלמה.</p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="tech-note" className="block text-[12px] font-medium text-muted">
          הערת פתרון / שטח
        </label>
        <Textarea
          id="tech-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="מה בוצע בשטח… (חובה מומלצת בסיום)"
          className="min-h-[96px] text-[16px] md:text-[13px]"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-medium text-muted">תמונה מהשטח</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            disabled={pending || !canAct}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            מצלמה
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={pending || !canAct}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            גלריה
          </Button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="תצוגה מקדימה" className="max-h-48 w-full object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute end-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-sm"
              aria-label="הסר תמונה"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="inline-flex min-h-[var(--touch-min)] items-center gap-1.5 text-[12px] text-muted"
          onClick={() => setShowUrl((v) => !v)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {showUrl ? 'הסתר קישור' : 'או הדביקו קישור לתמונה'}
        </button>
        {showUrl ? (
          <Input
            id="tech-photo"
            type="url"
            value={photoUrl.startsWith('data:') ? '' : photoUrl}
            onChange={(e) => {
              setPhotoUrl(e.target.value)
              setPreview(e.target.value || null)
            }}
            placeholder="https://…"
            dir="ltr"
          />
        ) : null}
      </div>

      <Button
        type="button"
        size="lg"
        disabled={pending || !canAct || (!note.trim() && !photoUrl.trim())}
        onClick={() => void submit(isUnassigned ? { claim: true } : {})}
      >
        שמירת הערה / תמונה
      </Button>

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[var(--radius-md)] border border-success/20 bg-success-soft px-3 py-2 text-[13px] text-success">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function statusActionLabel(from: TicketStatus | string, to: TicketStatus): string {
  if (from === 'assigned' && to === 'in_progress') return 'התחלת טיפול'
  if (to === 'waiting_parts') return 'ממתין לחלקים'
  if (to === 'in_progress') return 'חזרה לטיפול'
  if (to === 'resolved') return `סיום · ${TICKET_STATUS_LABELS_HE.resolved}`
  return TICKET_STATUS_LABELS_HE[to] ?? to
}
