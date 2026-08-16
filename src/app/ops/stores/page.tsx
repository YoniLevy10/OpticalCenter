import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, Panel, EmptyState } from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { RowList } from '@/components/ui/operational-row'
import { StoreSearch } from './store-search'
import { StoreCreateForm } from './store-create-form'
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
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="חנויות"
          meta={fromDb ? `${activeCount} פעילות` : 'מצב דמו'}
        />

        {canMutate ? <StoreCreateForm /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StoreSearch initial={sp.q ?? ''} />
          <p className="t-meta t-num text-ink-3">{filtered.length} תוצאות</p>
        </div>

        <Panel flush className="overflow-hidden">
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
                    <TH className="w-[160px]">טקסט זיהוי</TH>
                    <TH className="w-[100px]" align="end">
                      QR
                    </TH>
                    <TH className="w-[120px]" align="end">
                      קישור
                    </TH>
                  </THead>
                  <TBody>
                    {filtered.map((s) => (
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
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden">
                <RowList className="stagger">
                  {filtered.map((s) => (
                    <Link
                      key={s.id}
                      href={`/ops/stores/${encodeURIComponent(s.code)}`}
                      className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3 active:bg-canvas"
                    >
                      <span className="t-body-strong t-num w-10 shrink-0 text-ink">
                        {s.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-body block truncate text-ink">
                          {s.name}
                        </span>
                        <span className="t-meta block truncate text-ink-2">
                          {s.city ?? '—'}
                          {s.is_active === false ? ' · מושבת' : ''}
                        </span>
                      </span>
                      {(openCountByStore.get(s.id) ?? 0) > 0 ? (
                        <span className="t-caption t-num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--signal-critical-soft)] px-1.5 text-[var(--signal-critical)]">
                          {openCountByStore.get(s.id)}
                        </span>
                      ) : (
                        <span className="t-caption shrink-0 text-ink-3">QR</span>
                      )}
                    </Link>
                  ))}
                </RowList>
              </div>
            </>
          )}
        </Panel>

        <p className="t-caption text-ink-3">
          קוד החנות זהה בקישור ה־QR, ה־NFC ובהודעת הטקסט. מספר עסקי מוגדר ב־
          <span dir="ltr" className="t-num">
            NEXT_PUBLIC_WA_BUSINESS_PHONE
          </span>
        </p>
      </div>
    </AppShell>
  )
}
