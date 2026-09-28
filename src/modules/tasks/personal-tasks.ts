/**
 * Personal ops tasks — per-browser, scoped by actor id (or guest).
 * Lightweight local list for HQ daily follow-ups (option א).
 */

export type PersonalTask = {
  id: string
  title: string
  done: boolean
  created_at: string
  updated_at: string
}

const STORAGE_PREFIX = 'maintainos-personal-tasks:'

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId || 'guest'}`
}

export function loadPersonalTasks(ownerId: string): PersonalTask[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(ownerId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersonalTask[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          typeof t.title === 'string' &&
          typeof t.done === 'boolean',
      )
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return b.created_at.localeCompare(a.created_at)
      })
  } catch {
    return []
  }
}

function persist(ownerId: string, tasks: PersonalTask[]) {
  localStorage.setItem(storageKey(ownerId), JSON.stringify(tasks))
}

export function addPersonalTask(ownerId: string, title: string): PersonalTask[] {
  const trimmed = title.trim()
  if (!trimmed) return loadPersonalTasks(ownerId)
  const now = new Date().toISOString()
  const next: PersonalTask = {
    id: crypto.randomUUID(),
    title: trimmed.slice(0, 200),
    done: false,
    created_at: now,
    updated_at: now,
  }
  const tasks = [next, ...loadPersonalTasks(ownerId)]
  persist(ownerId, tasks)
  return tasks
}

export function togglePersonalTask(
  ownerId: string,
  id: string,
): PersonalTask[] {
  const now = new Date().toISOString()
  const tasks = loadPersonalTasks(ownerId).map((t) =>
    t.id === id ? { ...t, done: !t.done, updated_at: now } : t,
  )
  persist(ownerId, tasks)
  return tasks
}

export function deletePersonalTask(
  ownerId: string,
  id: string,
): PersonalTask[] {
  const tasks = loadPersonalTasks(ownerId).filter((t) => t.id !== id)
  persist(ownerId, tasks)
  return tasks
}

export function clearDonePersonalTasks(ownerId: string): PersonalTask[] {
  const tasks = loadPersonalTasks(ownerId).filter((t) => !t.done)
  persist(ownerId, tasks)
  return tasks
}
