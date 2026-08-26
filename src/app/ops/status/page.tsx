import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { KeyValue, PageHeader, Panel } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getSettings } from '@/modules/settings/service'
import { listVendors } from '@/modules/vendors/service'
import {
  memListAssets,
  memListPushSubscriptions,
  memListTickets,
  supabaseReady,
} from '@/lib/data/memory-store'

export const dynamic = 'force-dynamic'

export default async function OpsStatusPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const ready = await supabaseReady()
  const { settings } = await getSettings()
  const vendorResult = await listVendors()
  const tickets = memListTickets()
  const open = tickets.filter(
    (t) => !['resolved', 'closed', 'cancelled'].includes(t.status),
  ).length

  return (
    <OpsAppShell>
      <div className="max-w-2xl space-y-4">
        <PageHeader
          className="hidden md:flex"
          title="סטטוס מערכת"
          meta="בריאות תפעולית"
        />

        <Panel>
          <h2 className="t-section mb-3 text-ink">Backend</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="Supabase מוכן">{ready ? 'כן' : 'לא (זיכרון)'}</KeyValue>
            <KeyValue label="FORCE_MEMORY">
              {process.env.MAINTAINOS_FORCE_MEMORY === '1' ? 'פעיל' : 'כבוי'}
            </KeyValue>
            <KeyValue label="Resend">
              {process.env.RESEND_API_KEY ? 'מוגדר' : 'חסר'}
            </KeyValue>
            <KeyValue label="VAPID ציבורי">
              {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'מוגדר' : 'חסר (דמו)'}
            </KeyValue>
            <KeyValue label="אימייל התראות SLA">
              {settings.notify_email || 'לא הוגדר בהגדרות'}
            </KeyValue>
          </dl>
        </Panel>

        <Panel>
          <h2 className="t-section mb-3 text-ink">נפחים (זיכרון)</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="תקלות פתוחות">{String(open)}</KeyValue>
            <KeyValue label="תקלות סה״כ">{String(tickets.length)}</KeyValue>
            <KeyValue label="נכסים">{String(memListAssets().length)}</KeyValue>
            <KeyValue label="ספקים">{String(vendorResult.vendors.length)}</KeyValue>
            <KeyValue label="מנויי Push">
              {String(memListPushSubscriptions().length)}
            </KeyValue>
          </dl>
        </Panel>

        <Panel>
          <h2 className="t-section mb-3 text-ink">SLA (מדיניות)</h2>
          <dl className="divide-y divide-border">
            <KeyValue label="קריטי">
              {settings.sla_respond_hours_critical} שע׳ תגובה
            </KeyValue>
            <KeyValue label="גבוה">
              {settings.sla_respond_hours_high} שע׳ תגובה
            </KeyValue>
            <KeyValue label="בינוני">
              {settings.sla_respond_hours_medium} שע׳ תגובה
            </KeyValue>
            <KeyValue label="נמוך">
              {settings.sla_respond_hours_low} שע׳ תגובה
            </KeyValue>
          </dl>
          <p className="t-meta mt-3 text-ink-3">
            ניתן לערוך ב־
            <Link href="/ops/settings" className="text-[var(--tenant)] hover:underline">
              הגדרות
            </Link>
            .
          </p>
        </Panel>

        <Panel>
          <p className="t-body text-ink-2">
            בדיקת חיים:{' '}
            <Link href="/api/health" className="text-[var(--tenant)] hover:underline" dir="ltr">
              /api/health
            </Link>
          </p>
        </Panel>
      </div>
    </OpsAppShell>
  )
}
