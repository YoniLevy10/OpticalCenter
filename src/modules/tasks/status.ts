export const TASK_STATUSES = ['open', 'doing', 'waiting', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'פתוח',
  doing: 'בטיפול',
  waiting: 'ממתין',
  done: 'הושלם',
}

type TaskBits = {
  done: boolean
  needsClarification: boolean
  status?: TaskStatus | null
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
}

export function readTaskStatus(task: TaskBits): TaskStatus {
  if (task.status && isTaskStatus(task.status)) return task.status
  if (task.done) return 'done'
  if (task.needsClarification) return 'waiting'
  return 'open'
}

/** Buttons that move the task off its current status. */
export function taskStatusMoves(status: TaskStatus): { status: TaskStatus; label: string; tone: 'primary' | 'resolve' | 'secondary' }[] {
  if (status === 'open') {
    return [
      { status: 'doing', label: 'בטיפול', tone: 'primary' },
      { status: 'waiting', label: 'ממתין', tone: 'secondary' },
      { status: 'done', label: 'הושלם', tone: 'resolve' },
    ]
  }
  if (status === 'doing') {
    return [
      { status: 'done', label: 'הושלם', tone: 'resolve' },
      { status: 'waiting', label: 'ממתין', tone: 'secondary' },
      { status: 'open', label: 'חזרה לפתוח', tone: 'secondary' },
    ]
  }
  if (status === 'waiting') {
    return [
      { status: 'doing', label: 'חזרה לטיפול', tone: 'primary' },
      { status: 'done', label: 'הושלם', tone: 'resolve' },
      { status: 'open', label: 'חזרה לפתוח', tone: 'secondary' },
    ]
  }
  return [{ status: 'open', label: 'פתיחה מחדש', tone: 'secondary' }]
}
