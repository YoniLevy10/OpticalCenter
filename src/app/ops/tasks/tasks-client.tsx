'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EmptyState,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import {
  addPersonalTask,
  clearDonePersonalTasks,
  deletePersonalTask,
  loadPersonalTasks,
  togglePersonalTask,
  type PersonalTask,
} from '@/modules/tasks/personal-tasks'
import { cn } from '@/lib/utils'

export function TasksClient({ ownerId }: { ownerId: string }) {
  const [tasks, setTasks] = useState<PersonalTask[]>([])
  const [title, setTitle] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setTasks(loadPersonalTasks(ownerId))
    setReady(true)
  }, [ownerId])

  function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setTasks(addPersonalTask(ownerId, title))
    setTitle('')
  }

  const openCount = tasks.filter((t) => !t.done).length
  const doneCount = tasks.length - openCount

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onAdd}
        className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-3"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="משימה חדשה…"
          aria-label="כותרת משימה"
          className="min-w-0 flex-1"
          maxLength={200}
        />
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          הוספה
        </Button>
      </form>

      <Panel flush elevated className="overflow-hidden">
        <PanelHeader
          title="המשימות שלי"
          meta={
            ready
              ? `${openCount} פתוחות${doneCount ? ` · ${doneCount} בוצעו` : ''}`
              : '…'
          }
          action={
            doneCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTasks(clearDonePersonalTasks(ownerId))}
              >
                נקה שבוצעו
              </Button>
            ) : undefined
          }
        />
        {!ready ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="אין משימות"
            description="הוסיפו משימה אישית — נשמרת במכשיר הזה בלבד."
          />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  aria-label={t.done ? 'סמן כלא בוצע' : 'סמן כבוצע'}
                  aria-pressed={t.done}
                  onClick={() =>
                    setTasks(togglePersonalTask(ownerId, t.id))
                  }
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                    t.done
                      ? 'border-[var(--signal-resolved)] bg-[var(--signal-resolved)] text-white'
                      : 'border-border text-transparent hover:border-[var(--tenant)]',
                  )}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </button>
                <span
                  className={cn(
                    't-body min-w-0 flex-1 text-ink',
                    t.done && 'text-ink-3 line-through',
                  )}
                >
                  {t.title}
                </span>
                <button
                  type="button"
                  aria-label="מחק משימה"
                  onClick={() =>
                    setTasks(deletePersonalTask(ownerId, t.id))
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-3 hover:bg-surface-sunken hover:text-[var(--signal-critical)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
