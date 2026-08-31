import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { StatusHealthPanel } from './status-health-panel'

export const dynamic = 'force-dynamic'

export default function OpsStatusPage() {
  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PageHeader className="hidden md:flex" title="בריאות המערכת"
          description="האם הכול עובד כשורה" />
        <StatusHealthPanel />
      </div>
    </OpsAppShell>
  )
}
