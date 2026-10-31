'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AgentCreate } from '@/components/ops/agent-create'
import { AgentHistoryButton, AgentHistoryList } from '@/components/ops/agent-history'
import { AgentTurns } from '@/components/ops/agent-turn'
import { useAgentThreads } from '@/components/ops/use-agent-threads'
import type { AgentLink } from '@/modules/ops/agent-threads'

const STARTERS = ['איזה סניף הכי דחוף?', 'כמה מחכה?', 'מה כדאי לאחד?']

export function RetainChat() {
  const { turns, setTurns, threads, activeId, ready, restore, startFresh } = useAgentThreads()
  const [history, setHistory] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const briefed = useRef(false)

  useEffect(() => {
    if (!ready || briefed.current) return
    briefed.current = true
    if (turns.length > 0) return
    startFresh()
    setPending(true)
    void fetch('/api/ops/agent-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'מה המצב?' }),
    })
      .then((res) => res.json())
      .then((json: { reply?: string; error?: string }) => {
        if (json.reply) setTurns([{ role: 'assistant', text: json.reply }])
        else setError(json.error || 'העוזר לא הצליח לענות')
      })
      .catch(() => setError('אין קשר לעוזר כרגע'))
      .finally(() => setPending(false))
  }, [ready, turns.length, startFresh, setTurns])

  async function ask(text: string) {
    const message = text.trim()
    if (!message || pending) return
    const prior = turns.slice(-6)
    setHistory(false)
    setTurns((current) => [...current, { role: 'user', text: message }])
    setDraft('')
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/ops/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, history: prior }),
      })
      const json = (await res.json().catch(() => null)) as {
        reply?: string
        links?: AgentLink[]
        error?: string
      } | null
      if (!res.ok || !json?.reply) {
        setError(json?.error || 'העוזר לא הצליח לענות')
        return
      }
      setTurns((current) => [...current, { role: 'assistant', text: json.reply!, links: json.links }])
    } catch {
      setError('אין קשר לעוזר כרגע')
    } finally {
      setPending(false)
    }
  }

  function beginNew() {
    startFresh()
    setHistory(false)
    setError(null)
    setPending(true)
    void fetch('/api/ops/agent-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'מה המצב?' }),
    })
      .then((res) => res.json())
      .then((json: { reply?: string; error?: string }) => {
        if (json.reply) setTurns([{ role: 'assistant', text: json.reply }])
        else setError(json.error || 'העוזר לא הצליח לענות')
      })
      .catch(() => setError('אין קשר לעוזר כרגע'))
      .finally(() => setPending(false))
  }

  return (
    <section
      aria-label="העוזר של ארי"
      className="flex min-h-[28rem] flex-col rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-1)]"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="t-section text-ink">העוזר של ארי</p>
          <p className="t-meta text-ink-3">על הסניף שדורש אותך, ועל הכסף.</p>
        </div>
        <AgentHistoryButton pressed={history} onClick={() => setHistory((value) => !value)} />
      </header>
      {history ? (
        <AgentHistoryList
          threads={threads}
          activeId={activeId}
          onOpen={(id) => {
            restore(id)
            setHistory(false)
          }}
          onNew={beginNew}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
          <AgentTurns turns={turns} />
          {pending ? <p className="t-meta text-ink-3">מסתכל על הרשת…</p> : null}
          {error ? <p className="t-meta text-[var(--signal-critical)]">{error}</p> : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
        <AgentCreate disabled={pending} onCreate={(message) => void ask(message)} />
        {STARTERS.map((starter) => (
          <Button
            key={starter}
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => void ask(starter)}
          >
            {starter}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2 px-5 pb-4"
        onSubmit={(event) => {
          event.preventDefault()
          void ask(draft)
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="שאלה על הסניף או על הכסף"
          aria-label="שאלה על הסניף או על הכסף"
          className="t-body h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
        />
        <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
          שליחה
        </Button>
      </form>
    </section>
  )
}
