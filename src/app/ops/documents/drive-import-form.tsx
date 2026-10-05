'use client'

import { FormEvent, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { importDriveAction } from '../work-actions'

export function DriveImportForm({
  connectedFolder,
  statusLine,
  canWrite,
}: {
  connectedFolder: string | null
  statusLine: string | null
  canWrite: boolean
}) {
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDone(null)
    const formData = new FormData()
    formData.set('link', link)
    start(async () => {
      try {
        const result = await importDriveAction(formData)
        const parts = [
          result.imported ? `${result.imported} עודכנו מהדרייב` : null,
          result.pushed ? `${result.pushed} נכתבו לתיקיות` : null,
          result.removed ? `${result.removed} סומנו כחסרים בדרייב` : null,
          result.review ? `${result.review} דורשים בדיקה` : null,
        ].filter(Boolean)
        setDone(
          parts.length
            ? `הסנכרון הסתיים. ${parts.join(', ')}.`
            : 'הסנכרון הסתיים. אין שינוי חדש.',
        )
        if (result.writeSkipped) {
          setError('הקריאה מהתיקייה עבדה. כתיבה חזרה לדרייב דורשת חשבון שירות עם הרשאת עורך.')
        }
        setLink('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'הסנכרון נכשל')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field
        label="תיקייה בגוגל דרייב"
        htmlFor="drive-link"
        hint="התיקייה שארי מעדכן. קובץ בתוך תיקיית סניף, למשל 6018, משויך לסניף. שינוי שלו נכנס לכאן, ומסמך שנשמר כאן נכתב לתיקיית הסניף."
      >
        <Input
          id="drive-link"
          name="link"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder={connectedFolder ? 'אפשר להחליף תיקייה בקישור חדש' : 'https://drive.google.com/drive/folders/…'}
          required={!connectedFolder}
          dir="ltr"
        />
      </Field>
      {connectedFolder ? (
        <p className="t-meta text-ink-2" dir="ltr">
          {connectedFolder}
        </p>
      ) : null}
      {statusLine ? <p className="t-meta text-ink">{statusLine}</p> : null}
      {!canWrite ? (
        <p className="t-meta text-ink-2">
          בלי חשבון שירות הסנכרון קורא את התיקייה בלבד. כדי שקובץ שנשמר כאן יופיע אצלו בדרייב, משתפים את התיקייה עם חשבון השירות כעורך.
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="touch" disabled={pending}>
        {pending ? 'מסנכרן…' : connectedFolder ? 'סנכרון עכשיו' : 'חיבור וסנכרון'}
      </Button>
      {done ? <p className="t-meta text-ink">{done}</p> : null}
      {error ? <p className="t-meta text-[var(--signal-critical)]">{error}</p> : null}
    </form>
  )
}
