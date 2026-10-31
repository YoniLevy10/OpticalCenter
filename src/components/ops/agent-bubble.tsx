'use client'

import { usePhrase } from '@/components/i18n/locale-provider'
import { MessageSquare, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AgentCreate } from '@/components/ops/agent-create'
import { AgentHistoryButton, AgentHistoryList } from '@/components/ops/agent-history'
import { AgentTurns } from '@/components/ops/agent-turn'
import { useAgentThreads } from '@/components/ops/use-agent-threads'
import type { AgentLink } from '@/modules/ops/agent-threads'

export function AgentBubble() {
  const p = usePhrase()
  const starters = [p('איזה סניף הכי דחוף?'), p('כמה מחכה?'), p('מה כדאי לאחד?')]
  const { turns, setTurns, threads, activeId, ready, restore, startFresh } = useAgentThreads()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const briefed = useRef(false)

  useEffect(() => {
    if (!open || !ready || briefed.current) return
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
      .then((json: { reply?: string }) => {
        if (json.reply) setTurns([{ role: 'assistant', text: json.reply }])
      })
      .catch(() => setError(p('אין קשר לסוכן כרגע')))
      .finally(() => setPending(false))
  }, [open, ready, turns.length, startFresh, setTurns, p])

  async function send(text: string) {
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
        setError(json?.error || p('הסוכן לא הצליח לענות'))
        return
      }
      setTurns((current) => [...current, { role: 'assistant', text: json.reply!, links: json.links }])
    } catch {
      setError(p('אין קשר לסוכן כרגע'))
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
      .then((json: { reply?: string }) => {
        if (json.reply) setTurns([{ role: 'assistant', text: json.reply }])
      })
      .catch(() => setError(p('אין קשר לסוכן כרגע')))
      .finally(() => setPending(false))
  }

  return (
    <div className="fixed right-4 z-40 bottom-[calc(var(--bottomnav-h)+var(--bottomnav-gap)+var(--safe-b)+12px)] md:bottom-6 md:right-[calc(var(--nav-w)+1rem)]">
      {open ? (
        <section
          role="dialog"
          aria-label={p('העוזר של ארי')}
          className="absolute bottom-16 right-0 flex h-[min(32rem,70dvh)] w-[min(22rem,calc(100dvw-2rem))] max-w-[calc(100dvw-2rem)] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface text-ink shadow-[var(--shadow-2)]"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium">{p('העוזר של ארי')}</p>
            <div className="flex items-center">
              <AgentHistoryButton pressed={history} onClick={() => setHistory((value) => !value)} />
              <button
                type="button"
                aria-label={p('סגור')}
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
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
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
              <AgentTurns turns={turns} compact />
              {pending ? <p className="text-xs text-ink-3">{p('מסתכל על הרשת…')}</p> : null}
              {error ? <p className="text-sm text-[var(--signal-critical)]">{error}</p> : null}
            </div>
          )}
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            <AgentCreate disabled={pending} onCreate={(message) => void send(message)} />
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={pending}
                onClick={() => send(starter)}
                className="rounded-full border border-border px-3 py-1 text-xs text-ink-2"
              >
                {starter}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void send(draft)
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={p('שאלה לארי')}
              aria-label={p('שאלה לסוכן')}
              className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3 py-2 text-sm text-ink outline-none"
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="rounded-full bg-ink px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              {p('שלח')}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? p('סגור את הסוכן') : p('פתח את הסוכן')}
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[var(--shadow-2)]"
      >
        <MessageSquare className="h-6 w-6" aria-hidden />
      </button>
    </div>
  )
}
