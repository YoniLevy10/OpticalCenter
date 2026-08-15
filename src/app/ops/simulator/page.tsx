import { OpsShell } from '@/components/layout/ops-shell'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <OpsShell
      title="סימולטור WhatsApp"
      subtitle="דיווח ללא Meta — אותו שירות קליטה כמו ה־webhook"
    >
      <p className="mb-4 max-w-2xl text-sm text-zinc-600">
        זרימה: זיהוי חנות (`STORE_172` או קוד מספרי) ← תיאור תקלה (אופציונלי: תמונה) ← פתיחת
        תקלה ואישור בעברית. מספר WhatsApp אחד לכל מדינה; קוד חנות מספרי בלבד.
      </p>
      <SimulatorForm />
    </OpsShell>
  )
}
