import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listTasks } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { readTaskStatus } from '@/modules/tasks/status'
import { addTaskAction, voiceTasksAction } from '../work-actions'
import { TaskBoard } from './task-board'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const tasks = listTasks()
  const counts = { open: 0, doing: 0, waiting: 0, done: 0 }
  for (const task of tasks) counts[readTaskStatus(task)] += 1

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <OpsPageHero
          largeTitle
          title="משימות"
          status={
            tasks.length
              ? `${counts.open} פתוחות · ${counts.doing} בטיפול · ${counts.waiting} ממתינות · ${counts.done} הושלמו`
              : 'אין משימות פתוחות'
          }
        />
        {tasks.length ? <TaskBoard tasks={tasks} /> : null}
        <PhoneFoldStack>
        <PhoneFold title="משימה חדשה" summary="טופס קצר">
          <form action={addTaskAction} className="grid gap-3">
            <Field label="משימה" htmlFor="task-title">
              <Input id="task-title" name="title" placeholder="מה צריך לעשות" required />
            </Field>
            <Field label="קוד סניף" htmlFor="task-store">
              <Input id="task-store" name="storeCode" placeholder="6018" />
            </Field>
            <Field label="אחראי" htmlFor="task-owner">
              <Input id="task-owner" name="assignee" placeholder="שם" />
            </Field>
            <Field label="מועד" htmlFor="task-due">
              <Input id="task-due" name="due" type="date" />
            </Field>
            <Field label="תקלה מקושרת" htmlFor="task-ticket">
              <Input id="task-ticket" name="ticketId" placeholder="מספר תקלה, אם יש" />
            </Field>
            <Button type="submit">הוספה</Button>
          </form>
        </PhoneFold>
        <PhoneFold title="פיצול מהקלטה" summary="כמה משימות במשפט">
          <form action={voiceTasksAction} className="grid gap-3">
            <Field
              label="פיצול מהקלטה"
              htmlFor="task-transcript"
              hint="כמה משימות במשפט אחד, מופרדות ב«וגם»."
            >
              <Input
                id="task-transcript"
                name="transcript"
                placeholder="לבדוק מזגן בסניף 6018 וגם להזמין מנעולן"
                required
              />
            </Field>
            <Button type="submit" variant="secondary">פיצול מהקלטה</Button>
          </form>
        </PhoneFold>
        </PhoneFoldStack>
      </div>
    </OpsAppShell>
  )
}
