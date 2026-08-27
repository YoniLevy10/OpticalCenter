import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { SimulatorForm } from './simulator-form'

export const dynamic = 'force-dynamic'

export default function SimulatorPage() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/tickets"
          backLabel="חזרה לתקלות"
          title="סימולטור WhatsApp"
          meta="כלי פיתוח"
        />
        <PageHeader
          title="סימולטור WhatsApp"
          description="כלי פנימי לבדיקת intake — אותה זרימה כמו ה־webhook האמיתי."
          meta="כלי פיתוח"
          className="hidden md:flex"
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
    </OpsAppShell>
  )
}
