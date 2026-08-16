'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

export function StoreEditControls({
  id,
  name: initialName,
  city: initialCity,
  isActive,
}: {
  id: string
  name: string
  city: string | null
  isActive: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [city, setCity] = useState(initialCity ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    await patch({ name: name.trim(), city: city.trim() || null })
  }

  return (
    <form onSubmit={onSave} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="שם" htmlFor={`edit-name-${id}`}>
          <Input
            id={`edit-name-${id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[10rem]"
          />
        </Field>
        <Field label="עיר" htmlFor={`edit-city-${id}`}>
          <Input
            id={`edit-city-${id}`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="min-w-[8rem]"
          />
        </Field>
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          שמירה
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void patch({ is_active: !isActive })}
        >
          {isActive ? 'השבתה' : 'הפעלה'}
        </Button>
      </div>
      {error ? <p className="t-caption text-[var(--signal-critical)]">{error}</p> : null}
    </form>
  )
}
