import Link from 'next/link'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, KeyValue } from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { SettingsForm } from './settings-form'
import { getSettings } from '@/modules/settings/service'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { settings } = await getSettings()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 stagger">
        <OpsPageHero
          title="הגדרות"
          status={`${settings.brand_name} · ${settings.country_label}`}
        />

        <SettingsForm initial={settings} />

        <Panel elevated>
          <h2 className="t-section mb-3 text-ink">פריסה</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="מוצר">MaintainOS</KeyValue>
            <KeyValue label="לקוח">{settings.brand_name}</KeyValue>
            <KeyValue label="מדינה">{settings.country_label}</KeyValue>
            <KeyValue label="ערוץ דיווח">WhatsApp</KeyValue>
          </dl>
        </Panel>

        <Panel elevated>
          <h2 className="t-section text-ink">בריאות המערכת</h2>
          <Link
            href="/ops/status"
            className="t-body mt-2 inline-block text-[var(--signal-progress)] hover:underline"
          >
            מצב המערכת
          </Link>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
