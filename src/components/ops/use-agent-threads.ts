'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  newThreadId,
  readAgentThreads,
  upsertAgentThread,
  type AgentThread,
  type AgentTurn,
} from '@/modules/ops/agent-threads'

export function useAgentThreads() {
  const [threads, setThreads] = useState<AgentThread[]>([])
  const [turns, setTurnsState] = useState<AgentTurn[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const startedAt = useRef(0)
  const skipSave = useRef(true)

  useEffect(() => {
    const loaded = readAgentThreads()
    setThreads(loaded)
    const latest = loaded[0]
    if (latest) {
      setActiveId(latest.id)
      startedAt.current = latest.startedAt
      setTurnsState(latest.turns)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (!activeId || turns.length === 0) return
    const saved = upsertAgentThread({
      id: activeId,
      startedAt: startedAt.current || Date.now(),
      updatedAt: Date.now(),
      turns,
    })
    setThreads(saved)
  }, [turns, ready, activeId])

  const setTurns = useCallback(
    (updater: AgentTurn[] | ((current: AgentTurn[]) => AgentTurn[])) => {
      setTurnsState((current) => (typeof updater === 'function' ? updater(current) : updater))
    },
    [],
  )

  const restore = useCallback((id: string) => {
    const thread = readAgentThreads().find((item) => item.id === id)
    if (!thread) return
    skipSave.current = true
    startedAt.current = thread.startedAt
    setActiveId(thread.id)
    setTurnsState(thread.turns)
  }, [])

  const startFresh = useCallback(() => {
    skipSave.current = true
    startedAt.current = Date.now()
    setActiveId(newThreadId())
    setTurnsState([])
  }, [])

  return { turns, setTurns, threads, activeId, ready, restore, startFresh }
}
