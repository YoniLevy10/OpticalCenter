import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import {
  GroupedList,
  GroupedRow,
  GroupedSection,
} from '@/components/ui/grouped-list'
import { SettingsForm } from './settings-form'
import { getSettings } from '@/modules/settings/service'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { settings } = await getSettings()

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 stagger">
        <OpsPageHero
          largeTitle
          title="הגדרות"
          status={`${settings.brand_name} · ${settings.country_label}`}
        />

        <SettingsForm initial={settings} />

        <GroupedList>
          <GroupedSection title="פריסה">
            <GroupedRow className="justify-between">
              <span className="t-body text-ink-2">מוצר</span>
              <span className="t-body text-ink">MILO</span>
            </GroupedRow>
            <GroupedRow className="justify-between">
              <span className="t-body text-ink-2">לקוח</span>
              <span className="t-body text-ink">{settings.brand_name}</span>
            </GroupedRow>
            <GroupedRow className="justify-between">
              <span className="t-body text-ink-2">מדינה</span>
              <span className="t-body text-ink">{settings.country_label}</span>
            </GroupedRow>
            <GroupedRow className="justify-between">
              <span className="t-body text-ink-2">ערוץ דיווח</span>
              <span className="t-body text-ink">WhatsApp</span>
            </GroupedRow>
          </GroupedSection>
        </GroupedList>
      </div>
    </OpsAppShell>
  )
}
