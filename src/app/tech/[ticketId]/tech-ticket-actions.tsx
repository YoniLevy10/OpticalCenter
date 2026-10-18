'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Play, Upload } from 'lucide-react'
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
 * in progress → סיימתי (treatment summary + before/after proof + server save)
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
  const beforeInputId = useId()
  const afterInputId = useId()
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<CompletionPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [note, setNote] = useState('')
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)

  const isUnassigned = !assignedTo
  const isMine = Boolean(techId && assignedTo === techId)
  const canAct = Boolean(techId) && (isMine || isUnassigned)
  const actions = nextStatusActions(status)
  const canStart = actions.includes('in_progress')
  const canResolve = actions.includes('resolved')
  const phaseLabel = completionBusyLabel(phase)
  const canSubmit =
    treatmentSummaryValid(note) &&
    Boolean(beforeFile) &&
    Boolean(afterFile) &&
    !busy &&
    online

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

  async function uploadProof(file: File, role: 'before' | 'after') {
    const check = validateMediaFile(file)
    if (!check.ok) throw new Error(check.error)
    const form = new FormData()
    form.append('file', file)
    form.append('proof_role', role)
    const up = await fetch(`/api/tickets/${ticketId}/attachments`, {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    })
    const upData = (await up.json().catch(() => ({}))) as { error?: string }
    if (!up.ok) throw new Error(upData.error ?? 'העלאת הוכחה נכשלה')
  }

  async function resolveWithProof() {
    if (!beforeFile || !afterFile || !treatmentSummaryValid(note)) return
    if (!online) {
      setError('אין חיבור — נסו שוב כשהרשת חוזרת')
      setPhase('error')
      return
    }
    setBusy(true)
    setError(null)
    setPhase('uploading')
    try {
      await uploadProof(beforeFile, 'before')
      await uploadProof(afterFile, 'after')

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

      toast.push({ title: TECH_COMPLETION.successToast, tone: 'success' })
      setPhase('done')
      setNote('')
      setBeforeFile(null)
      setAfterFile(null)
      setSheetOpen(false)
      startTransition(() => router.refresh())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'העלאת הוכחה נכשלה'
      setError(msg)
      toast.push({ title: 'העלאת הוכחה נכשלה', tone: 'critical' })
      setPhase('error')
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
            label={TECH_COMPLETION.proofBeforeLabel}
            htmlFor={beforeInputId}
            hint={TECH_COMPLETION.proofHint}
          >
            <input
              id={beforeInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              capture="environment"
              className="t-control w-full text-ink"
              disabled={busy}
              onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field
            label={TECH_COMPLETION.proofAfterLabel}
            htmlFor={afterInputId}
          >
            <input
              id={afterInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              capture="environment"
              className="t-control w-full text-ink"
              disabled={busy}
              onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
            />
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
