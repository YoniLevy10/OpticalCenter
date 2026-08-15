import { OpsShell } from '@/components/layout/ops-shell'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <OpsShell
      pathname="/ops/simulator"
      title="סימולטור WhatsApp"
      subtitle="כלי פיתוח · אותו intake כמו ה־webhook"
    >
      <p className="mb-4 max-w-2xl text-[13px] text-muted">
        זרימה: `STORE_172` ← תיאור תקלה ← אישור. נגיש גם מ־הגדרות.
      </p>
      <SimulatorForm />
    </OpsShell>
  )
}
