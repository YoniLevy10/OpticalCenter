import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <PageToolbar backHref="/ops/lab" backLabel="חזרה" showRefresh />
        <OpsPageHero title="סימולטור WhatsApp" />
        <Panel elevated className="px-4 py-5 md:px-5">
          <SimulatorForm />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
