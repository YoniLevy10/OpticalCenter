/** Ari's chats with his assistant. Kept on this browser, dropped after 24 hours. */

export type AgentLink = { href: string; label: string }

export type AgentTurn = { role: 'user' | 'assistant'; text: string; links?: AgentLink[] }

/** A click under an older reply that was saved before links were stored. */
export function linksInReply(text: string): AgentLink[] {
  const links: AgentLink[] = []
  if (/רשמתי משימה|המשימה כבר רשומה/.test(text)) {
    links.push({ href: '/ops/tasks', label: 'למשימה' })
  }
  const seen = new Set<string>()
  for (const match of text.matchAll(/OC-\d+/g)) {
    const number = match[0]
    if (seen.has(number)) continue
    seen.add(number)
    links.push({ href: `/ops/tickets?q=${encodeURIComponent(number)}`, label: number })
  }
  return links
}

export type AgentThread = {
  id: string
  startedAt: number
  updatedAt: number
  turns: AgentTurn[]
}

export const AGENT_THREAD_TTL_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'milo-ari-agent-threads'

export function pruneAgentThreads(threads: AgentThread[], now = Date.now()): AgentThread[] {
  return threads
    .filter((thread) => now - thread.updatedAt < AGENT_THREAD_TTL_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function threadTitle(thread: AgentThread): string {
  const asked = thread.turns.find((turn) => turn.role === 'user')
  const text = asked?.text.trim() || 'מבט על הרשת'
  return text.length > 42 ? `${text.slice(0, 40)}…` : text
}

export function threadWhen(updatedAt: number, now = Date.now()): string {
  const minutes = Math.floor(Math.max(0, now - updatedAt) / 60_000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דק׳`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  return 'אתמול'
}

export function newThreadId(): string {
  return `ari-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function validThread(value: unknown): value is AgentThread {
  if (!value || typeof value !== 'object') return false
  const thread = value as AgentThread
  return (
    typeof thread.id === 'string' &&
    typeof thread.startedAt === 'number' &&
    typeof thread.updatedAt === 'number' &&
    Array.isArray(thread.turns)
  )
}

export function readAgentThreads(now = Date.now()): AgentThread[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    const rows = Array.isArray(parsed) ? parsed.filter(validThread) : []
    const pruned = pruneAgentThreads(rows, now)
    if (pruned.length !== rows.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    }
    return pruned
  } catch {
    return []
  }
}

export function upsertAgentThread(thread: AgentThread, now = Date.now()): AgentThread[] {
  if (typeof window === 'undefined') return []
  const next = pruneAgentThreads(
    [thread, ...readAgentThreads(now).filter((item) => item.id !== thread.id)],
    now,
  )
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
