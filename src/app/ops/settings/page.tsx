import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel, KeyValue } from '@/components/ui/primitives'
import { SettingsForm } from './settings-form'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { getSettings } from '@/modules/settings/service'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { settings } = await getSettings()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader
          title="הגדרות"
          description="פרופיל, התראות, הרשאות, WhatsApp ומערכת — שמירה לפי קטגוריה."
          meta="פיילוט ישראל"
        />

        <SettingsForm initial={settings} />

        <Panel>
          <h2 className="t-section mb-3 text-ink">פריסה נוכחית</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="מוצר">MaintainOS</KeyValue>
            <KeyValue label="לקוח">{settings.brand_name}</KeyValue>
            <KeyValue label="מדינה">{settings.country_label}</KeyValue>
            <KeyValue label="ערוץ דיווח">WhatsApp</KeyValue>
          </dl>
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">בריאות המערכת</h2>
          <p className="t-body mb-3 mt-1 text-ink-2">
            סטטוס תפעולי בשפה פשוטה — לא צ׳קליסט טכני.
          </p>
          <Link
            href="/ops/status"
            className="t-body-strong text-[var(--signal-progress)] hover:underline"
          >
            האם הכול עובד?
          </Link>
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">כלי פיתוח</h2>
          <p className="t-body mb-3 mt-1 text-ink-2">
            יצירת תקלה משויכת לבדיקת הזרימה מקצה לקצה.
          </p>
          <SeedDemoTicketButton />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
