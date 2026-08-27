'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/overlay'
import { Notice } from '@/components/ui/primitives'

export function StoreCreateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setCode('')
    setName('')
    setCity('')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          city: city.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="touch"
        className="md:h-9 md:px-3.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        הוספת סניף
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
        title="הוספת סניף"
        description="קוד מספרי · שם · עיר (אזור)"
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="קוד" htmlFor="store-code">
            <Input
              id="store-code"
              dir="ltr"
              inputMode="numeric"
              pattern="\d{1,6}"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="172"
            />
          </Field>
          <Field label="שם" htmlFor="store-name">
            <Input
              id="store-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="תל אביב…"
            />
          </Field>
          <Field label="עיר / אזור" htmlFor="store-city">
            <Input
              id="store-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="תל אביב"
            />
          </Field>
          {error ? <Notice tone="warning">{error}</Notice> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                reset()
              }}
            >
              ביטול
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {busy ? 'שומר…' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
