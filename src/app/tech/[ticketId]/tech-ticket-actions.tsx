'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useOnline } from '@/hooks/use-online'
import { Check, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea, Field } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { ErrorState } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { nextStatusActions } from '@/modules/tickets/tech'

/**
 * One primary action for field techs:
 * waiting → התחל טיפול
 * in progress → סיימתי (note + confirm)
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [note, setNote] = useState('')

  const isUnassigned = !assignedTo
  const isMine = Boolean(techId && assignedTo === techId)
  const canAct = Boolean(techId) && (isMine || isUnassigned)
  const actions = nextStatusActions(status)
  const canStart = actions.includes('in_progress')
  const canResolve = actions.includes('resolved')

  async function submit(body: Record<string, unknown>, success: string) {
    if (!online) {
      setError('אין חיבור — נסו שוב כשהרשת חוזרת')
      return
    }
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
        credentials: 'same-origin',
        body: JSON.stringify({
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
      setSheetOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setError('אין חיבור — נסו שוב כשהרשת חוזרת')
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    } finally {
      setBusy(false)
    }
  }

  if (status === 'resolved' || status === 'closed') {
    return (
      <div className="t-body flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--signal-resolved)]/25 bg-[var(--signal-resolved-soft)] px-4 py-3 text-[var(--signal-resolved)]">
        <Check className="h-4 w-4" aria-hidden />
        העבודה הושלמה ✓
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
        <p className="t-body rounded-[var(--radius-md)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-3 py-2 text-[var(--signal-warning)]">
          העבודה משויכת לטכנאי אחר
        </p>
      ) : canStart ? (
        <Button
          type="button"
          variant="primary"
          size="block"
          disabled={busy || !online}
          onClick={() =>
            void submit({ status: 'in_progress' }, 'הטיפול התחיל')
          }
        >
          <Play className="h-4 w-4" aria-hidden />
          התחל טיפול
        </Button>
      ) : canResolve ? (
        <Button
          type="button"
          variant="primary"
          size="block"
          disabled={busy || !online}
          onClick={() => setSheetOpen(true)}
        >
          <Check className="h-4 w-4" aria-hidden />
          סיימתי
        </Button>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="סיום העבודה"
        description="כתבו בקצרה מה בוצע"
      >
        <div className="space-y-4">
          <Field label="הערה" htmlFor="tech-resolve-note">
            <Textarea
              id="tech-resolve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="לדוגמה: הוחלף חלק, נבדק שהכל תקין"
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
                },
                'העבודה הושלמה',
              )
            }
          >
            אישור
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
