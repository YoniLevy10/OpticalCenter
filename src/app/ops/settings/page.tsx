import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { Card } from '@/components/ui/primitives'

export default function SettingsPage() {
  return (
    <OpsShell
      pathname="/ops/settings"
      title="הגדרות"
      subtitle="פיילוט ישראל · כלים וחיבורים"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            href: '/ops/simulator',
            title: 'סימולטור WhatsApp',
            desc: 'דמו בלי Meta — STORE_172',
          },
          {
            href: '/login',
            title: 'התחברות',
            desc: 'קישור קסם (Supabase Auth)',
          },
          {
            href: '/tech',
            title: 'פורטל טכנאי',
            desc: 'PWA שטח לצוות תחזוקה',
          },
          {
            href: '/api/health',
            title: 'Health',
            desc: 'בדיקת שירות',
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full p-4 transition-colors hover:bg-canvas">
              <div className="text-[14px] font-medium">{item.title}</div>
              <p className="mt-1 text-[13px] text-muted">{item.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div id="maintenance" className="scroll-mt-24">
        <Card className="mt-4 p-4">
          <h2 className="text-[14px] font-medium">תחזוקה מערכתית</h2>
          <p className="mt-2 text-[13px] text-muted">
            Stub לפיילוט — ניהול ספקים חיצוניים, חוזים ותחזוקה מונעת יתווספו כאן.
            כרגע השימוש העיקרי הוא תקלות HQ ופורטל טכנאי.
          </p>
        </Card>
      </div>
    </OpsShell>
  )
}
