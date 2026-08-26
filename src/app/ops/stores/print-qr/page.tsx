import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader, Panel, EmptyState } from '@/components/ui/primitives'
import { PrintQrClient } from './print-qr-client'
import { fetchStores } from '@/modules/stores/data'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function PrintQrBatchPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { stores } = await fetchStores()
  const active = stores.filter((s) => s.is_active !== false)

  return (
    <AppShell>
      <div className="space-y-4 print:p-0">
        <PageToolbar
          backHref="/ops/stores"
          backLabel="חזרה לחנויות"
          title="הדפסת QR"
          meta={`${active.length} חנויות`}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <PageHeader title="הדפסת QR" meta={`${active.length} חנויות`} className="hidden md:flex" />
          <PrintQrClient />
        </div>

        <Panel elevated className="print:border-0 print:p-0 print:shadow-none">
          <p className="t-body mb-4 text-ink-2 print:hidden">
            כל כרטיס כולל QR ל־WhatsApp עם טקסט STORE_CODE. השתמשו בהדפסה מהדפדפן
            (PDF).
          </p>
          {active.length === 0 ? (
            <EmptyState title="אין חנויות פעילות" description="הוסיפו חנות לפני הדפסת QR." />
          ) : (
            <ul
              role="list"
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2"
            >
              {active.map((s) => (
                <li key={s.id}>
                  <div className="break-inside-avoid rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/stores/qr?code=${encodeURIComponent(s.code)}&format=svg`}
                      alt={`QR ${s.code}`}
                      className="mx-auto h-40 w-40"
                    />
                    <p className="t-body-strong mt-3 text-ink">{s.name}</p>
                    <p className="t-num t-meta text-ink-2">#{s.code}</p>
                    <p dir="ltr" className="t-caption t-num mt-1 text-ink-3">
                      STORE_{s.code}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  )
}
