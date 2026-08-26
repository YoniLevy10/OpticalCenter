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

  const { events, backend } = await listRecentAuditEvents(100)

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה ללוח בקרה"
          title="יומן פעילות"
          meta={backend === 'memory' ? 'מצב דמו' : undefined}
          showRefresh
        />
        <PageHeader
          title="יומן פעילות"
          meta={backend === 'memory' ? 'מצב דמו' : undefined}
          className="hidden md:flex"
        />

        <ActivityLog events={events} />
      </div>
    </OpsAppShell>
  )
}
