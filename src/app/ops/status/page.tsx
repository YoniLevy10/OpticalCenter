import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { StatusHealthPanel } from './status-health-panel'
import { PhoneDesktopOnly } from '@/components/layout/phone-desktop-only'

export const dynamic = 'force-dynamic'

export default function OpsStatusPage() {
  return (
    <OpsAppShell>
      <PhoneDesktopOnly title="סטטוס מערכת">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 stagger">
        <OpsPageHero
          title="סטטוס מערכת"
          status="בריאות השירותים בזמן אמת"
        />
        <StatusHealthPanel />
      </div>
      </PhoneDesktopOnly>
    </OpsAppShell>
  )
}
