import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar backHref="/ops/lab" backLabel="חזרה" showRefresh />
        <PageHeader className="hidden md:flex" title="סימולטור WhatsApp" />
        <SimulatorForm />
      </div>
    </OpsAppShell>
  )
}
