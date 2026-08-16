import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, Panel, KeyValue } from '@/components/ui/primitives'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'

export const dynamic = 'force-dynamic'

const LINKS = [
  {
    href: '/ops/simulator',
    title: 'סימולטור WhatsApp',
    desc: 'הרצת intake בלי Meta',
  },
  { href: '/tech', title: 'פורטל טכנאי', desc: 'PWA שטח נפרד' },
  { href: '/login', title: 'התחברות', desc: 'קישור קסם (Supabase Auth)' },
  { href: '/api/health', title: 'בדיקת שירות', desc: 'סטטוס API' },
]

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl space-y-4">
        <PageHeader title="הגדרות" meta="פיילוט ישראל" />

        <Panel flush className="overflow-hidden">
          <ul className="divide-y divide-border">
            {LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1">
                    <span className="t-body-strong block text-ink">
                      {item.title}
                    </span>
                    <span className="t-meta block text-ink-2">{item.desc}</span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-ink-3 rtl:rotate-180 ltr:rotate-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h2 className="t-section mb-3 text-ink">פריסה</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="מוצר">MaintainOS</KeyValue>
            <KeyValue label="לקוח">Optical Center</KeyValue>
            <KeyValue label="מדינה">ישראל · עברית</KeyValue>
            <KeyValue label="ערוץ דיווח">WhatsApp</KeyValue>
          </dl>
        </Panel>

        <Panel>
          <h2 className="t-section text-ink">כלי פיתוח</h2>
          <p className="t-body mb-3 mt-1 text-ink-2">
            יצירת תקלה משויכת לבדיקת הזרימה מקצה לקצה.
          </p>
          <SeedDemoTicketButton />
        </Panel>
      </div>
    </AppShell>
  )
}
