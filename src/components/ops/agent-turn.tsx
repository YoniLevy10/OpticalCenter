'use client'

import type { AgentTurn } from '@/modules/ops/agent-threads'

export function AgentTurns({
  turns,
  compact = false,
}: {
  turns: AgentTurn[]
  compact?: boolean
}) {
  return turns.map((turn, index) => {
    const mine = turn.role === 'user'
    const className = mine
      ? compact
        ? 'max-w-[90%] self-end whitespace-pre-wrap rounded-2xl bg-ink px-3 py-2 text-sm text-white'
        : 't-body max-w-[90%] self-end whitespace-pre-wrap rounded-[var(--radius-lg)] bg-ink px-3 py-2 text-white'
      : compact
        ? 'max-w-[95%] self-start whitespace-pre-wrap rounded-2xl bg-surface-sunken px-3 py-2 text-sm text-ink'
        : 't-body max-w-[95%] self-start whitespace-pre-wrap text-ink'
    return (
      <p key={`${turn.role}-${index}`} className={className}>
        {turn.text}
      </p>
    )
  })
}
