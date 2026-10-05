import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listTasks } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { toggleTaskAction } from '../work-actions'
import { TaskComposer } from './task-composer'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const tasks = listTasks()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <OpsPageHero
          largeTitle
          title="משימות"
          status="נשמרות בשרת, עם סניף, אחראי ומועד"
        />
        <Panel elevated>
          <TaskComposer />
        </Panel>
        {tasks.map((task) => (
          <Panel key={task.id} elevated>
            <p className={`t-body ${task.done ? 'text-ink-3 line-through' : ''}`}>{task.title}</p>
            <p className="t-meta text-ink-2">
              {task.storeCode || 'בלי סניף'} · {task.assignee || 'בלי אחראי'} · {task.dueAt || 'בלי מועד'}
              {task.needsClarification ? ` · ${task.clarification}` : ''}
              {task.spendId ? ' · בקשת כסף ממתינה לאישור' : ''}
            </p>
            <form action={toggleTaskAction} className="mt-2">
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="done" value={task.done ? '0' : '1'} />
              <Button type="submit" size="sm">{task.done ? 'פתיחה מחדש' : 'הושלם'}</Button>
            </form>
          </Panel>
        ))}
      </div>
    </OpsAppShell>
  )
}
