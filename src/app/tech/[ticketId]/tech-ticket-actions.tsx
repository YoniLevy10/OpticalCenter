'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Camera, Check, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Field } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { ErrorState } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { nextStatusActions } from '@/modules/tickets/tech'
import type { TicketStatus } from '@/modules/tickets/constants'

/**
 * The technician gets ONE obvious next action, at the thumb.
 *
 * assigned      → התחלת טיפול
 * in_progress   → סיום העבודה   (+ ממתין לחלקים as a lesser move)
 * waiting_parts → חזרה לטיפול   (+ סיום)
 *
 * Resolution requires a note, so the sheet gates the destructive-ish final move
 * rather than letting a stray tap close a job with no record.
 */

type ActionSpec = {
  status: TicketStatus
  label: string
  variant: 'primary' | 'secondary' | 'resolve'
  icon: typeof Play
  requiresNote?: boolean
}

function specFor(status: string, to: TicketStatus): ActionSpec {
  if (to === 'in_progress') {
    return {
      status: to,
      label: status === 'waiting_parts' ? 'חזרה לטיפול' : 'התחלת טיפול',
      variant: 'primary',
      icon: Play,
    }
  }
  if (to === 'waiting_parts') {
    return {
      status: to,
      label: 'ממתין לחלקים',
      variant: 'secondary',
      icon: Pause,
    }
  }
  return {
    status: to,
    label: 'סיום העבודה',
    variant: 'resolve',
    icon: Check,
    requiresNote: true,
  }
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
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sheet, setSheet] = useState<null | 'resolve' | 'evidence'>(null)
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  const isUnassigned = !assignedTo
  const isMine = Boolean(techId && assignedTo === techId)
  const canAct = Boolean(techId) && (isMine || isUnassigned)
  const actions = nextStatusActions(status).map((s) => specFor(status, s))

  const primary = actions.find((a) => a.variant !== 'secondary')
  const secondary = actions.filter((a) => a.variant === 'secondary')

  async function submit(body: Record<string, unknown>, success: string) {
    if (!techId) {
      setError('לא זוהה טכנאי')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/tech/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techId,
          claim: isUnassigned ? true : undefined,
          ...body,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'העדכון נכשל')
        toast.push({ title: 'העדכון נכשל', tone: 'critical' })
        return
      }
      toast.push({ title: success, tone: 'success' })
      setNote('')
      setPhotoUrl('')
      setSheet(null)
      startTransition(() => router.refresh())
    } catch {
      setError('אין חיבור — נסו שוב כשהרשת חוזרת')
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    } finally {
      setBusy(false)
    }
  }

  function onPrimary() {
    if (!primary) return
    if (primary.requiresNote) {
      setSheet('resolve')
      return
    }
    void submit({ status: primary.status }, `${primary.label} — נשמר`)
  }

  if (status === 'resolved' || status === 'closed') {
    return (
      <div className="t-body flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--signal-resolved)]/25 bg-[var(--signal-resolved-soft)] px-4 py-3 text-[var(--signal-resolved)]">
        <Check className="h-4 w-4" aria-hidden />
        העבודה הושלמה
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error ? <ErrorState title="לא ניתן לעדכן" description={error} /> : null}

      {!canAct ? (
        <p className="t-body rounded-[var(--radius-md)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-3 py-2 text-[var(--signal-warning)]">
          העבודה משויכת לטכנאי אחר
        </p>
      ) : (
        <>
          {primary ? (
            <Button
              type="button"
              variant={primary.variant === 'resolve' ? 'resolve' : 'primary'}
              size="block"
              disabled={busy}
              onClick={onPrimary}
            >
              <primary.icon className="h-4 w-4" aria-hidden />
              {isUnassigned ? `תפיסה · ${primary.label}` : primary.label}
            </Button>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="touch"
              className="flex-1"
              disabled={busy}
              onClick={() => setSheet('evidence')}
            >
              <Camera className="h-4 w-4" aria-hidden />
              תיעוד
            </Button>
            {secondary.map((a) => (
              <Button
                key={a.status}
                type="button"
                variant="secondary"
                size="touch"
                className="flex-1"
                disabled={busy}
                onClick={() => void submit({ status: a.status }, `${a.label} — נשמר`)}
              >
                <a.icon className="h-4 w-4" aria-hidden />
                {a.label}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* ---------- Resolve sheet: note is mandatory ---------- */}
      <BottomSheet
        open={sheet === 'resolve'}
        onOpenChange={(v) => !v && setSheet(null)}
        title="סיום העבודה"
        description="תארו בקצרה מה בוצע בשטח"
      >
        <div className="space-y-4">
          <Field label="הערת פתרון" htmlFor="tech-resolve-note">
            <Textarea
              id="tech-resolve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="לדוגמה: הוחלף קבל במעבה, נבדקה קירור תקינה"
            />
          </Field>
          <Field
            label="קישור לתמונה"
            htmlFor="tech-resolve-photo"
            hint="אופציונלי — העלאת קבצים תיתמך בהמשך"
          >
            <Input
              id="tech-resolve-photo"
              type="url"
              dir="ltr"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Button
            type="button"
            variant="resolve"
            size="block"
            disabled={busy || !note.trim()}
            onClick={() =>
              void submit(
                {
                  status: 'resolved',
                  note: note.trim(),
                  resolution_note: note.trim(),
                  photoUrl: photoUrl.trim() || undefined,
                },
                'העבודה הושלמה',
              )
            }
          >
            סיום העבודה
          </Button>
          {!note.trim() ? (
            <p className="t-caption text-center text-ink-3">
              נדרשת הערת פתרון כדי לסיים
            </p>
          ) : null}
        </div>
      </BottomSheet>

      {/* ---------- Evidence sheet ---------- */}
      <BottomSheet
        open={sheet === 'evidence'}
        onOpenChange={(v) => !v && setSheet(null)}
        title="הוספת תיעוד"
        description="הערה או תמונה — נשמר ביומן התקלה"
      >
        <div className="space-y-4">
          <Field label="הערת שטח" htmlFor="tech-note">
            <Textarea
              id="tech-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="מה נמצא בשטח…"
            />
          </Field>
          <Field label="קישור לתמונה" htmlFor="tech-photo">
            <Input
              id="tech-photo"
              type="url"
              dir="ltr"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Button
            type="button"
            variant="primary"
            size="block"
            disabled={busy || (!note.trim() && !photoUrl.trim())}
            onClick={() =>
              void submit(
                {
                  note: note.trim() || undefined,
                  photoUrl: photoUrl.trim() || undefined,
                },
                'התיעוד נשמר',
              )
            }
          >
            שמירה
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
