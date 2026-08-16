import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, Panel, PanelHeader, KeyValue } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getStoreByCode } from '@/modules/stores/service'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'
import { QrDownloadButtons } from '../qr-download-buttons'
import { StoreEditControls } from '../store-edit-controls'

export const dynamic = 'force-dynamic'

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const { code: raw } = await params
  const code = decodeURIComponent(raw).trim()
  const { store, backend } = await getStoreByCode(code)
  if (!store) notFound()

  const deepLink = storeWhatsAppDeepLink(store.code)
  const canEdit = actor?.memberships.some(
    (m) => m.role === 'global_admin' || m.role === 'country_manager',
  )

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          title={store.name}
          meta={
            <>
              <span className="t-num" dir="ltr">
                {store.code}
              </span>
              {backend === 'memory' ? ' · מצב דמו' : null}
              {store.is_active === false ? ' · מושבתת' : null}
            </>
          }
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/stores">לרשימה</Link>
            </Button>
          }
        />

        <Panel className="space-y-3">
          <KeyValue label="עיר">{store.city ?? '—'}</KeyValue>
          <KeyValue label="טקסט זיהוי" ltr>
            {storeWhatsAppPrefill(store.code)}
          </KeyValue>
          <KeyValue label="קישור WhatsApp">
            <a
              href={deepLink}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="t-caption break-all text-ink-2 underline-offset-2 hover:underline"
            >
              {deepLink}
            </a>
          </KeyValue>
        </Panel>

        <Panel flush className="overflow-hidden">
          <PanelHeader title="QR להדפסה" meta="wa.me" />
          <div className="flex flex-col items-center gap-4 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/stores/qr?code=${encodeURIComponent(store.code)}&format=svg`}
              alt={`QR לחנות ${store.code}`}
              className="h-48 w-48 rounded-[var(--radius-md)] border border-border bg-surface p-2"
            />
            <QrDownloadButtons code={store.code} />
            <p className="t-caption max-w-sm text-center text-ink-3">
              אותו קישור משמש גם לכתיבת NFC (NDEF URI). סרקו או הדביקו על דלת החנות.
            </p>
          </div>
        </Panel>

        {canEdit || shouldAllowDemoEntry() ? (
          <Panel flush className="overflow-hidden">
            <PanelHeader title="עריכה" />
            <div className="p-4">
              <StoreEditControls
                id={store.id}
                name={store.name}
                city={store.city}
                isActive={store.is_active !== false}
              />
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  )
}
