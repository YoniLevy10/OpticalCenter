import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { ActivityLog } from './activity-log'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listRecentAuditEvents } from '@/modules/audit/service'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { events } = await listRecentAuditEvents(150)

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <PageToolbar backHref="/ops/dashboard" backLabel="חזרה" showRefresh />
        <OpsPageHero
          title="יומן פעילות"
          status={
            events.length === 0
              ? 'אין אירועים עדיין'
              : `${events.length} אירועים אחרונים במערכת`
          }
        />
        <ActivityLog events={events} />
      </div>
    </OpsAppShell>
  )
}
