'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { addTaskAction, voiceTasksAction } from '../work-actions'

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechEngine = {
  lang: string
  onresult: ((event: SpeechResult) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
}

function speechEngine(): SpeechEngine | null {
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechEngine
    webkitSpeechRecognition?: new () => SpeechEngine
  }
  const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function TaskComposer() {
  const [open, setOpen] = useState<'task' | 'voice' | null>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  function dictate() {
    const engine = speechEngine()
    if (!engine) {
      setHint('הדפדפן הזה לא מקשיב. אפשר להקליד את ההכתבה.')
      return
    }
    setHint(null)
    setListening(true)
    engine.lang = 'he-IL'
    engine.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript?.trim()
      if (said) setTranscript(said)
    }
    engine.onerror = () => {
      setListening(false)
      setHint('ההכתבה נעצרה. אפשר לנסות שוב או להקליד.')
    }
    engine.onend = () => setListening(false)
    engine.start()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(open === 'task' ? null : 'task')}>
          + משימה
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(open === 'voice' ? null : 'voice')}
        >
          הכתבה
        </Button>
      </div>
      {open === 'task' ? (
        <form action={addTaskAction} className="grid gap-3">
          <Field label="משימה" htmlFor="task-title">
            <Input id="task-title" name="title" placeholder="מה צריך לעשות" required />
          </Field>
          <Field label="קוד סניף" htmlFor="task-store">
            <Input id="task-store" name="storeCode" placeholder="6018" />
          </Field>
          <Field label="אחראי" htmlFor="task-owner">
            <Input id="task-owner" name="assignee" placeholder="שם" />
          </Field>
          <Field label="מועד" htmlFor="task-due">
            <Input id="task-due" name="due" type="date" />
          </Field>
          <Button type="submit">הוספה</Button>
        </form>
      ) : null}
      {open === 'voice' ? (
        <form action={voiceTasksAction} className="grid gap-3">
          <Field
            label="הכתבה"
            htmlFor="task-transcript"
            hint="כמה עניינים במשפט אחד, מופרדים ב«וגם». חלק כספי נפתח כבקשה, לא כתשלום."
          >
            <Input
              id="task-transcript"
              name="transcript"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="לבדוק מזגן בסניף 6018 וגם להזמין מנעולן"
              required
            />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={dictate}>
              {listening ? 'מקשיב…' : 'דיבור'}
            </Button>
            <Button type="submit">פיצול</Button>
          </div>
          {hint ? <p className="t-meta text-ink-2">{hint}</p> : null}
        </form>
      ) : null}
    </div>
  )
}
