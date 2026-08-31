import Link from 'next/link'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel } from '@/components/ui/primitives'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function LabPage() {
  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader className="hidden md:flex" title="מעבדה" />

        <Panel>
          <h2 className="t-section text-ink">סימולטור WhatsApp</h2>
          <p className="t-body mb-3 mt-1 text-ink-2">
            בדיקת intake בלי Meta.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops/simulator">פתח סימולטור</Link>
          </Button>
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">תקלת הדגמה</h2>
          <p className="t-body mb-3 mt-1 text-ink-2">
            יצירת תקלה משויכת לבדיקת זרימה.
          </p>
          <SeedDemoTicketButton />
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">בריאות</h2>
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops/status">סטטוס מערכת</Link>
          </Button>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
