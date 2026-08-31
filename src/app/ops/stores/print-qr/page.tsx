import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader, Panel, EmptyState, Notice } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { PrintQrClient } from './print-qr-client'
import { fetchStores } from '@/modules/stores/data'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
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
        <PageToolbar backHref="/ops/stores" backLabel="חזרה" />
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <PageHeader
            className="hidden md:flex"
            title="הדפסת QR"
            meta={<span className="t-num">{active.length}</span>}
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
            כל כרטיס כולל QR ל־WhatsApp עם טקסט STORE_CODE. לחיצה על ה־QR פותחת
            את אותו קישור לכתיבת תג NFC. השתמשו בהדפסה מהדפדפן (PDF). מומלץ PNG
            לסריקה אמינה מהמסך.
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
              {active.map((s) => {
                const deepLink = storeWhatsAppDeepLink(s.code, businessPhone)
                return (
                  <li key={s.id}>
                    <div className="break-inside-avoid rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-center">
                      <a
                        href={deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="פתיחת קישור NFC / WhatsApp"
                        aria-label={`קישור NFC לסניף ${s.code}`}
                        className="mx-auto inline-block rounded-[var(--radius-md)] outline-none ring-[var(--tenant)] transition-opacity hover:opacity-90 focus-visible:ring-2 print:pointer-events-none"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/stores/qr?code=${encodeURIComponent(s.code)}&format=png`}
                          alt={`QR ${s.code}`}
                          width={160}
                          height={160}
                          className="h-40 w-40"
                        />
                      </a>
                      <p className="t-body-strong mt-3 text-ink">{s.name}</p>
                      <p className="t-num t-meta text-ink-2">#{s.code}</p>
                      <p dir="ltr" className="t-caption t-num mt-1 text-ink-3">
                        STORE_{s.code}
                      </p>
                      <a
                        href={deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="t-caption t-num mt-2 block break-all text-ink-3 underline-offset-2 hover:text-[var(--tenant)] hover:underline print:hidden"
                      >
                        {deepLink}
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </OpsAppShell>
  )
}
