import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader, Panel, EmptyState, Notice } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { PrintQrClient } from './print-qr-client'
import { fetchStores } from '@/modules/stores/data'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function PrintQrBatchPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const [{ stores }, businessPhone] = await Promise.all([
    fetchStores(),
    resolveWhatsAppBusinessPhone(),
  ])
  const active = stores.filter((s) => s.is_active !== false)
  const phoneReady = Boolean(businessPhone)

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4 print:p-0">
        <PageToolbar
          backHref="/ops/stores"
          backLabel="חזרה לחנויות"
          title="הדפסת QR"
          meta={`${active.length} חנויות`}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <PageHeader
            title="הדפסת QR"
            description="מדבקות QR לכל הסניפים — סריקה פותחת WhatsApp עם קוד החנות."
            meta={`${active.length} חנויות`}
            className="hidden md:flex"
          />
          {phoneReady ? <PrintQrClient /> : null}
        </div>

        {!phoneReady ? (
          <Notice tone="warning">
            <span className="t-body-strong block">חסר מספר WhatsApp עסקי</span>
            בלי מספר לא נוצרים קישורי QR תקינים. הגדירו ב־Ops → הגדרות → WhatsApp
            ואז רעננו את העמוד.
            <div className="mt-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/settings">מעבר להגדרות</Link>
              </Button>
            </div>
          </Notice>
        ) : null}

        <Panel elevated className="print:border-0 print:p-0 print:shadow-none">
          <p className="t-body mb-4 text-ink-2 print:hidden">
            כל כרטיס כולל QR ל־WhatsApp עם טקסט STORE_CODE. השתמשו בהדפסה מהדפדפן
            (PDF). מומלץ PNG לסריקה אמינה מהמסך.
          </p>
          {!phoneReady ? (
            <EmptyState
              title="QR לא זמין"
              description="הגדירו מספר WhatsApp עסקי לפני הדפסה."
            />
          ) : active.length === 0 ? (
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
                      src={`/api/stores/qr?code=${encodeURIComponent(s.code)}&format=png`}
                      alt={`QR ${s.code}`}
                      width={160}
                      height={160}
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
    </OpsAppShell>
  )
}
