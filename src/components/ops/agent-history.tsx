'use client'

import { History } from 'lucide-react'
import { threadTitle, threadWhen, type AgentThread } from '@/modules/ops/agent-threads'

export function AgentHistoryButton({
  pressed,
  onClick,
}: {
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label="שיחות אחרונות"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken"
    >
      <History className="h-4 w-4" aria-hidden />
    </button>
  )
}

export function AgentHistoryList({
  threads,
  activeId,
  onOpen,
  onNew,
}: {
  threads: AgentThread[]
  activeId: string | null
  onOpen: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
      <button
        type="button"
        onClick={onNew}
        className="t-body rounded-[var(--radius-md)] border border-border px-3 py-2 text-start text-ink"
      >
        שיחה חדשה
      </button>
      {threads.length === 0 ? (
        <p className="t-meta text-ink-3">אין שיחות מ־24 השעות האחרונות.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {threads.map((thread) => {
            const current = thread.id === activeId
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onOpen(thread.id)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] px-3 py-2 text-start hover:bg-surface-sunken"
                >
                  <span className="t-body text-ink">{threadTitle(thread)}</span>
                  <span className="t-meta text-ink-3">
                    {current ? 'פתוחה עכשיו · ' : ''}
                    {threadWhen(thread.updatedAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
