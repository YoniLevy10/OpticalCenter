import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { StatusHealthPanel } from './status-health-panel'

export const dynamic = 'force-dynamic'

export default function OpsStatusPage() {
  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5 stagger">
        <OpsPageHero title="סטטוס מערכת" />
        <StatusHealthPanel />
      </div>
    </OpsAppShell>
  )
}
