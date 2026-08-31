import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel, KeyValue } from '@/components/ui/primitives'
import { SettingsForm } from './settings-form'
import { getSettings } from '@/modules/settings/service'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { settings } = await getSettings()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader className="hidden md:flex" title="הגדרות" />

        <SettingsForm initial={settings} />

        <Panel>
          <h2 className="t-section mb-3 text-ink">פריסה</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="מוצר">MaintainOS</KeyValue>
            <KeyValue label="לקוח">{settings.brand_name}</KeyValue>
            <KeyValue label="מדינה">{settings.country_label}</KeyValue>
            <KeyValue label="ערוץ דיווח">WhatsApp</KeyValue>
          </dl>
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">בריאות המערכת</h2>
          <Link
            href="/ops/status"
            className="t-body mt-2 inline-block text-[var(--signal-progress)] hover:underline"
          >
            סטטוס מערכת
          </Link>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
