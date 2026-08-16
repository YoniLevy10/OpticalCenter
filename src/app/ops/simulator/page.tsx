import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="סימולטור WhatsApp"
          meta="כלי פיתוח"
          actions={<SeedDemoTicketButton />}
        />
        <p className="t-body max-w-2xl text-ink-2">
          מריץ את אותו נתיב intake כמו ה־webhook האמיתי. הזרימה:{' '}
          <span dir="ltr" className="t-num">
            STORE_172
          </span>{' '}
          ← תיאור תקלה ← אישור עם מספר תקלה.
        </p>
        <SimulatorForm />
      </div>
    </AppShell>
  )
}
