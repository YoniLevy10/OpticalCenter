import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { ActivityLog } from './activity-log'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listRecentAuditEvents } from '@/modules/audit/service'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { events, backend } = await listRecentAuditEvents(150)

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה ללוח בקרה"
          title="יומן פעילות"
          meta={backend === 'memory' ? 'מצב דמו' : undefined}
          showRefresh
        />
        <PageHeader
          className="hidden md:flex"
          title="יומן פעילות"
          meta={backend === 'memory' ? 'מצב דמו' : undefined}
          description="מה קרה במערכת ובאיזה סדר — עם קישור לתקלה המקורית."
        />
        <ActivityLog events={events} />
      </div>
    </OpsAppShell>
  )
}
