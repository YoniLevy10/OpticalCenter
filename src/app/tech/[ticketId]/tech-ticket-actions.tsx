'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ImagePlus, Play, Upload } from 'lucide-react'
import { useOnline } from '@/hooks/use-online'
import { Button } from '@/components/ui/button'
import { Textarea, Field } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { nextStatusActions } from '@/modules/tickets/tech'
import { validateMediaFile } from '@/modules/tickets/media-limits'
import {
  TECH_COMPLETION,
  completionBusyLabel,
  treatmentSummaryValid,
  type CompletionPhase,
} from '@/modules/tech/completion-copy'
import { cn } from '@/lib/utils'

/**
 * Field tech primary action:
 * waiting → התחל טיפול
 * in progress → סיימתי (treatment summary + proof + server save)
 * Success copy is always «נשלח לאישור החנות» — never «נסגר».
 */
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
  const toast = useToast()
  const online = useOnline()
  const [, startTransition] = useTransition()
  const proofInputId = useId()
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<CompletionPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [note, setNote] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isUnassigned = !assignedTo
  const isMine = Boolean(techId && assignedTo === techId)
  const canAct = Boolean(techId) && (isMine || isUnassigned)
  const actions = nextStatusActions(status)
  const canStart = actions.includes('in_progress')
  const canResolve = actions.includes('resolved')
  const phaseLabel = completionBusyLabel(phase)
  const canSubmit =
    treatmentSummaryValid(note) && Boolean(proofFile) && !busy && online

  useEffect(() => {
    if (!proofFile || !proofFile.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(proofFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [proofFile])

  async function patchTicket(
    body: Record<string, unknown>,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!online) {
      return { ok: false, error: 'אין חיבור — נסו שוב כשהרשת חוזרת' }
    }
    if (!techId) {
      return { ok: false, error: 'לא זוהה טכנאי' }
    }
    try {
      const res = await fetch(`/api/tech/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          claim: isUnassigned ? true : undefined,
          ...body,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'העדכון נכשל' }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'אין חיבור — נסו שוב כשהרשת חוזרת' }
    }
  }

  async function startTreatment() {
    setBusy(true)
    setError(null)
    try {
      const result = await patchTicket({ status: 'in_progress' })
      if (!result.ok) {
        setError(result.error)
        toast.push({ title: 'העדכון נכשל', tone: 'critical' })
        return
      }
      toast.push({ title: TECH_COMPLETION.startSuccess, tone: 'success' })
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  async function resolveWithProof() {
    if (!proofFile || !treatmentSummaryValid(note)) return
    const check = validateMediaFile(proofFile)
    if (!check.ok) {
      setError(check.error)
      setPhase('error')
      return
    }
    if (!online) {
      setError('אין חיבור — נסו שוב כשהרשת חוזרת')
      setPhase('error')
      return
    }
    setBusy(true)
    setError(null)
    setPhase('uploading')
    try {
      const form = new FormData()
      form.append('file', proofFile)
      const up = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      })
      const upData = (await up.json().catch(() => ({}))) as {
        error?: string
      }
      if (!up.ok) {
        setError(upData.error ?? 'העלאת הוכחה נכשלה')
        toast.push({ title: 'העלאת הוכחה נכשלה', tone: 'critical' })
        setPhase('error')
        return
      }

      setPhase('saving')
      const saved = await patchTicket({
        status: 'resolved',
        note: note.trim(),
        resolution_note: note.trim(),
      })
      if (!saved.ok) {
        setError(saved.error)
        toast.push({ title: 'העדכון נכשל', tone: 'critical' })
        setPhase('error')
        return
      }

      // Success toast only after upload + server save.
      toast.push({ title: TECH_COMPLETION.successToast, tone: 'success' })
      setPhase('done')
      setNote('')
      setProofFile(null)
      setSheetOpen(false)
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
      setPhase((prev) => (prev === 'done' || prev === 'error' ? prev : 'idle'))
    }
  }

  if (status === 'resolved' || status === 'closed') {
    const awaitingStore = status === 'resolved'
    return (
      <div
        className={cn(
          'rounded-[var(--radius-md)] border px-4 py-3',
          awaitingStore
            ? 'border-[var(--signal-progress)]/30 bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]'
            : 'border-[var(--signal-resolved)]/25 bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]',
        )}
        role="status"
      >
        <div className="t-body flex items-center justify-center gap-2 font-medium">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {awaitingStore
            ? TECH_COMPLETION.successBanner
            : 'החנות אישרה · התקלה נסגרה'}
        </div>
        {awaitingStore ? (
          <p className="t-caption mt-1 text-center text-ink-2">
            {TECH_COMPLETION.successBannerHint}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error ? <ErrorState title="לא ניתן לעדכן" description={error} /> : null}

      {!online ? (
        <p
          className="t-body rounded-[var(--radius-md)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-3 py-2 text-[var(--signal-warning)]"
          role="alert"
        >
          אין חיבור לרשת — פעולות מושבתות עד לחזרת החיבור
        </p>
      ) : null}

      {!canAct ? (
        <Notice tone="warning">העבודה משויכת לטכנאי אחר</Notice>
      ) : canStart ? (
        <Button
          type="button"
          variant="primary"
          size="block"
          disabled={busy || !online}
          onClick={() => void startTreatment()}
        >
          <Play className="h-4 w-4" aria-hidden />
          {TECH_COMPLETION.startLabel}
        </Button>
      ) : canResolve ? (
        <Button
          type="button"
          variant="primary"
          size="block"
          disabled={busy || !online}
          onClick={() => {
            setPhase('idle')
            setError(null)
            setSheetOpen(true)
          }}
        >
          <Check className="h-4 w-4" aria-hidden />
          {TECH_COMPLETION.finishCta}
        </Button>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (busy) return
          setSheetOpen(open)
          if (!open) setPhase('idle')
        }}
        title={TECH_COMPLETION.sheetTitle}
        description={TECH_COMPLETION.sheetDescription}
      >
        <div className="space-y-4">
          <Field
            label={TECH_COMPLETION.treatmentLabel}
            htmlFor="tech-resolve-note"
            hint={TECH_COMPLETION.treatmentHint}
          >
            <Textarea
              id="tech-resolve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={TECH_COMPLETION.treatmentPlaceholder}
              disabled={busy}
              aria-required
            />
          </Field>

          <Field
            label={TECH_COMPLETION.proofLabel}
            htmlFor={proofInputId}
            hint={TECH_COMPLETION.proofHint}
          >
            <label
              htmlFor={proofInputId}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-sunken px-4 py-5 text-center transition-colors',
                busy ? 'pointer-events-none opacity-60' : 'hover:border-border-strong',
              )}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-28 w-full rounded-[var(--radius-sm)] object-cover"
                />
              ) : (
                <ImagePlus className="h-7 w-7 text-ink-3" aria-hidden />
              )}
              <span className="t-control text-ink">
                {proofFile ? proofFile.name : 'בחירת קובץ מהמצלמה או מהגלריה'}
              </span>
              {proofFile ? (
                <span className="t-caption t-num text-ink-3">
                  {(proofFile.size / 1024).toFixed(0)} KB · {proofFile.type || 'קובץ'}
                </span>
              ) : (
                <span className="t-caption text-ink-3">JPEG / PNG / WebP / MP4 / WebM</span>
              )}
              <input
                id={proofInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                capture="environment"
                className="sr-only"
                disabled={busy}
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>

          {phaseLabel ? (
            <p
              className="t-body flex items-center justify-center gap-2 text-[var(--signal-progress)]"
              role="status"
              aria-live="polite"
            >
              <Upload className="h-4 w-4 animate-pulse" aria-hidden />
              {phaseLabel}
            </p>
          ) : null}

          <Button
            type="button"
            variant="resolve"
            size="block"
            disabled={!canSubmit}
            onClick={() => void resolveWithProof()}
          >
            {phaseLabel ?? TECH_COMPLETION.submitLabel}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
