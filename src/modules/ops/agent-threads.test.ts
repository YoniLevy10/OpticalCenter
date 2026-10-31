import { describe, expect, it } from 'vitest'
import {
  AGENT_THREAD_TTL_MS,
  linksInReply,
  pruneAgentThreads,
  threadTitle,
  threadWhen,
  type AgentThread,
} from './agent-threads'

function thread(partial: Partial<AgentThread> & Pick<AgentThread, 'id'>): AgentThread {
  return {
    startedAt: 0,
    updatedAt: 0,
    turns: [{ role: 'user', text: 'מה פתוח?' }],
    ...partial,
  }
}

describe('agent threads', () => {
  it('drops a conversation once 24 hours have passed', () => {
    const now = Date.now()
    const kept = thread({ id: 'fresh', updatedAt: now - 60_000 })
    const old = thread({ id: 'old', updatedAt: now - AGENT_THREAD_TTL_MS - 1 })
    expect(pruneAgentThreads([old, kept], now).map((item) => item.id)).toEqual(['fresh'])
  })

  it('names a thread from the first question and says how long ago', () => {
    const now = Date.now()
    expect(threadTitle(thread({ id: 'a', turns: [{ role: 'assistant', text: 'ארי' }] }))).toBe(
      'מבט על הרשת',
    )
    expect(threadTitle(thread({ id: 'b' }))).toBe('מה פתוח?')
    expect(threadWhen(now - 5 * 60_000, now)).toBe('לפני 5 דק׳')
    expect(threadWhen(now - 3 * 3_600_000, now)).toBe('לפני 3 שע׳')
  })

  it('turns a saved reply into a click', () => {
    expect(linksInReply('רשמתי משימה: המדפסת. בסניף חיפה הרצל.')).toEqual([
      { href: '/ops/tasks', label: 'למשימה' },
    ])
    expect(linksInReply('פתחתי תקלה בחדרה: הנזילה בברז. OC-18026. היא חדשה.')).toEqual([
      { href: '/ops/tickets?q=OC-18026', label: 'OC-18026' },
    ])
  })
})
