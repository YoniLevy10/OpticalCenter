import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { ReportsHistoryClient } from './reports-history-client'

export const dynamic = 'force-dynamic'

export default async function ReportsHistoryPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageHeader title="היסטוריית דוחות" meta="סיכומים חודשיים" className="hidden md:flex" />
        <ReportsHistoryClient />
      </div>
    </OpsAppShell>
  )
}
