'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AgentCreate({
  disabled,
  onCreate,
}: {
  disabled: boolean
  onCreate: (message: string) => void
}) {
  const [kind, setKind] = useState<'task' | 'ticket' | null>(null)
  const [text, setText] = useState('')
  const ticket = kind === 'ticket'

  if (!kind) {
    return (
      <>
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => setKind('task')}>
          משימה חדשה
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => setKind('ticket')}>
          תקלה חדשה
        </Button>
      </>
    )
  }

  return (
    <form
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const body = text.trim()
        if (!body || disabled) return
        onCreate(ticket ? `תפתח תקלה ${body}` : `תפתח משימה ${body}`)
        setText('')
        setKind(null)
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={ticket ? 'מה קרה, ובאיזה סניף' : 'מה לעשות, ובאיזה סניף'}
        aria-label={ticket ? 'תקלה חדשה' : 'משימה חדשה'}
        className="t-body h-9 min-w-0 flex-1 rounded-full border border-border bg-surface px-3 text-ink"
      />
      <Button type="submit" size="sm" disabled={disabled || !text.trim()}>
        יצירה
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setText('')
          setKind(null)
        }}
      >
        ביטול
      </Button>
    </form>
  )
}
