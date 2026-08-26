import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel, KeyValue } from '@/components/ui/primitives'
import { SettingsForm } from './settings-form'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { getSettings } from '@/modules/settings/service'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const LINKS = [
  { href: '/ops/users', title: 'משתמשים', desc: 'תפקידים והיקף גאוגרפי' },
  { href: '/ops/assets', title: 'נכסים', desc: 'ציוד לפי חנות + QR' },
  { href: '/ops/vendors', title: 'ספקים', desc: 'שיגור Partner עם HMAC' },
  { href: '/ops/activity', title: 'יומן פעילות', desc: 'אירועי תקלות גלובלי' },
  { href: '/ops/status', title: 'סטטוס מערכת', desc: 'בריאות + מדיניות SLA' },
  { href: '/ops/inbox', title: 'תיבת WhatsApp', desc: 'השתלטות אנושית על שיחות' },
  { href: '/ops/reports', title: 'דוחות', desc: 'מגמות וייצוא' },
  { href: '/ops/stores/print-qr', title: 'הדפסת QR אצווה', desc: 'מדבקות לכל החנויות' },
  { href: '/ops/simulator', title: 'סימולטור WhatsApp', desc: 'בדיקת intake' },
  { href: '/tech', title: 'פורטל טכנאי', desc: 'PWA שטח' },
  { href: '/api/health', title: 'בדיקת שירות', desc: 'סטטוס API' },
]

export default async function SettingsPage() {
  const { settings } = await getSettings()

  return (
    <OpsAppShell>
      <div className="max-w-2xl space-y-4">
        <PageHeader title="הגדרות" meta="פיילוט ישראל" />

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

        <div className="space-y-2">
          <h2 className="t-section px-1 text-ink-2">קישורים</h2>
          <nav aria-label="קישורי הגדרות">
          <Panel flush className="overflow-hidden">
            <ul className="divide-y divide-border">
              {LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="t-body-strong block text-ink">{item.title}</span>
                      <span className="t-meta block text-ink-2">{item.desc}</span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-ink-3 rtl:rotate-180"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          </nav>
        </div>

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
