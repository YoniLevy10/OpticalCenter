import Link from 'next/link'
import { ListFinder } from '@/components/ops/list-finder'
import { Button } from '@/components/ui/button'
import type { OpsTask } from '@/lib/data/ops-ledger'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import {
  TASK_STATUS_LABEL,
  readTaskStatus,
  taskStatusMoves,
  type TaskStatus,
} from '@/modules/tasks/status'
import { setTaskStatusAction } from '../work-actions'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

export function TaskBoard({ tasks, now = new Date() }: { tasks: OpsTask[]; now?: Date }) {
  const ranked = [...tasks].sort((a, b) => rank(a, now) - rank(b, now) || dueTime(a) - dueTime(b))
  const open = ranked.filter((task) => readTaskStatus(task) !== 'done')
  const done = ranked.filter((task) => readTaskStatus(task) === 'done')

  return (
    <ListFinder placeholder="חיפוש משימה או סניף" one="משימה אחת" many="משימות">
      <PhoneFoldStack>
      <div className="store-stack">
        {open.map((task) => (
          <TaskCard key={task.id} task={task} now={now} />
        ))}
        {done.map((task) => (
          <TaskCard key={task.id} task={task} now={now} />
        ))}
      </div>
      </PhoneFoldStack>
    </ListFinder>
  )
}

function TaskCard({ task, now }: { task: OpsTask; now: Date }) {
  const status = readTaskStatus(task)
  const store = ISRAEL_STORES.find((row) => row.code === task.storeCode)
  const overdue = status !== 'done' && task.dueAt != null && new Date(task.dueAt).getTime() < now.getTime()
  const moves = taskStatusMoves(status)

  return (
    <article
      data-find-group
      data-find={`${task.title} ${store?.name || ''} ${task.storeCode || ''} ${task.assignee || ''} ${TASK_STATUS_LABEL[status]}`}
      id={`task-${task.id}`}
      className={
        overdue
          ? 'sheet scroll-mt-24 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface edge edge-overdue'
          : 'sheet scroll-mt-24 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface'
      }
    >
      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="t-meta text-ink-2">
          {store?.name || 'בלי סניף'}
          {task.storeCode ? ` · ${task.storeCode}` : ''}
          {task.assignee ? ` · ${task.assignee}` : ' · בלי אחראי'}
        </p>
        <h2 className={status === 'done' ? 't-body text-ink-3 line-through' : 't-body text-ink'}>
          {task.title}
        </h2>
        <span aria-hidden className="clay-rule" />
        <p className="t-meta text-ink-2">
          <StatusChip status={status} overdue={overdue} />
          {' · '}
          {formatDue(task.dueAt)}
          {overdue ? ' · באיחור' : ''}
        </p>
        {task.clarification ? <p className="t-meta text-ink">{task.clarification}</p> : null}
        {task.spendId ? (
          <Link href="/ops/approvals" className="t-meta text-ink underline">
            לבקשת הכסף
          </Link>
        ) : null}
        <PhoneFold title="פעולה" summary={TASK_STATUS_LABEL[status]}>
        <div className="mt-1 flex flex-wrap gap-2">
          {moves.map((move) => (
            <form key={move.status} action={setTaskStatusAction}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="status" value={move.status} />
              <Button type="submit" size="sm" variant={move.tone} aria-label={`${move.label} · ${task.title}`}>
                {move.label}
              </Button>
            </form>
          ))}
        </div>
        </PhoneFold>
      </div>
    </article>
  )
}

function StatusChip({ status, overdue }: { status: TaskStatus; overdue: boolean }) {
  const hot = overdue || status === 'waiting'
  return (
    <span
      className={
        hot
          ? 'inline-flex rounded-full border border-[var(--tenant-line)] bg-[var(--tenant-soft)] px-2 py-0.5 font-semibold text-[var(--tenant)]'
          : 'inline-flex rounded-full border border-border px-2 py-0.5 text-ink'
      }
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}

function rank(task: OpsTask, now: Date): number {
  const status = readTaskStatus(task)
  if (status === 'done') return 4
  if (task.dueAt && new Date(task.dueAt).getTime() < now.getTime()) return 0
  if (status === 'waiting') return 1
  if (status === 'doing') return 2
  return 3
}

function dueTime(task: OpsTask): number {
  if (!task.dueAt) return Number.POSITIVE_INFINITY
  const time = new Date(task.dueAt).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function formatDue(iso: string | null): string {
  if (!iso) return 'בלי מועד'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'בלי מועד'
  return date.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
