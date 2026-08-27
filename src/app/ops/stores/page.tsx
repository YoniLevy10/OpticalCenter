import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel, EmptyState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { StoreSearch } from './store-search'
import { StoreCreateForm } from './store-create-form'
import { StoresMobileList } from './stores-mobile-list'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const { stores, fromDb } = await fetchStores({ includeInactive: true })

  const { tickets } = await listTickets(500).catch(() => ({
    tickets: [],
    backend: 'memory' as const,
  }))

  const openCountByStore = new Map<string, number>()
  for (const t of tickets) {
    if (
      t.status === 'closed' ||
      t.status === 'cancelled' ||
      t.status === 'resolved'
    ) {
      continue
    }
    openCountByStore.set(t.store_id, (openCountByStore.get(t.store_id) ?? 0) + 1)
  }

  const filtered = q
    ? stores.filter((s) =>
        `${s.code} ${s.name} ${s.city ?? ''}`.toLowerCase().includes(q),
      )
    : stores

  const canMutate =
    actor?.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'country_manager',
    ) || shouldAllowDemoEntry()

  const activeCount = stores.filter((s) => s.is_active !== false).length

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageHeader
         
          title="חנויות"
          meta={fromDb ? `${activeCount} פעילות` : 'מצב דמו'}
        />

        {canMutate ? <StoreCreateForm /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StoreSearch initial={sp.q ?? ''} />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="touch" className="min-h-[var(--tap)]">
              <Link href="/ops/stores/print-qr">הדפסת QR</Link>
            </Button>
            <p className="t-meta t-num text-ink-3">{filtered.length} תוצאות</p>
          </div>
        </div>

        <Panel flush elevated className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו קוד חנות, שם או עיר."
              icon={Store}
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH className="w-[88px]">קוד</TH>
                    <TH>שם</TH>
                    <TH className="w-[140px]">עיר</TH>
                    <TH className="w-[88px]" align="end">
                      פתוחות
                    </TH>
                    <TH className="w-[160px]">טקסט זיהוי</TH>
                    <TH className="w-[100px]" align="end">
                      QR
                    </TH>
                    <TH className="w-[120px]" align="end">
                      קישור
                    </TH>
                  </THead>
                  <TBody>
                    {filtered.map((s) => {
                      const openCount = openCountByStore.get(s.id) ?? 0
                      return (
                      <TR key={s.id}>
                        <TD>
                          <span className="t-body-strong t-num text-ink">
                            {s.code}
                          </span>
                          {s.is_active === false ? (
                            <span className="t-caption ms-1 text-ink-3">מושבת</span>
                          ) : null}
                        </TD>
                        <TD>
                          <Link
                            href={`/ops/stores/${encodeURIComponent(s.code)}`}
                            className="t-body text-ink underline-offset-2 hover:underline"
                          >
                            {s.name}
                          </Link>
                        </TD>
                        <TD>
                          <span className="t-body text-ink-2">
                            {s.city ?? '—'}
                          </span>
                        </TD>
                        <TD align="end">
                          {openCount > 0 ? (
                            <Link
                              href={`/ops/tickets?store=${encodeURIComponent(s.code)}`}
                              className="t-body-strong t-num text-[var(--signal-critical)] underline-offset-2 hover:underline"
                            >
                              {openCount}
                            </Link>
                          ) : (
                            <span className="t-caption t-num text-ink-3">0</span>
                          )}
                        </TD>
                        <TD>
                          <span
                            dir="ltr"
                            className="t-caption t-num inline-block rounded-[var(--radius-sm)] bg-sunken px-1.5 py-0.5 text-ink-2"
                          >
                            {storeWhatsAppPrefill(s.code)}
                          </span>
                        </TD>
                        <TD align="end">
                          <Link
                            href={`/ops/stores/${encodeURIComponent(s.code)}`}
                            className="t-body text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                          >
                            QR
                          </Link>
                        </TD>
                        <TD align="end">
                          <a
                            href={storeWhatsAppDeepLink(s.code)}
                            target="_blank"
                            rel="noreferrer"
                            className="t-body text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                          >
                            WhatsApp
                          </a>
                        </TD>
                      </TR>
                      )
                    })}
                  </TBody>
                </Table>
              </div>

              {/* Mobile */}
              <StoresMobileList
                stores={filtered.map((s) => ({
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  city: s.city,
                  is_active: s.is_active,
                  openCount: openCountByStore.get(s.id) ?? 0,
                }))}
              />
            </>
          )}
        </Panel>

        <p className="t-caption text-ink-3">
          קוד החנות זהה בקישור ה־QR, ה־NFC ובהודעת הטקסט ל־WhatsApp.
        </p>
      </div>
    </OpsAppShell>
  )
}
