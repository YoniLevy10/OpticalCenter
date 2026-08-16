import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, Panel, EmptyState } from '@/components/ui/primitives'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { RowList } from '@/components/ui/operational-row'
import { StoreSearch } from './store-search'
import { fetchStores } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const { stores, fromDb } = await fetchStores()

  const filtered = q
    ? stores.filter((s) =>
        `${s.code} ${s.name} ${s.city ?? ''}`.toLowerCase().includes(q),
      )
    : stores

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="חנויות"
          meta={fromDb ? `${stores.length} פעילות` : 'מצב דמו'}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StoreSearch initial={sp.q ?? ''} />
          <p className="t-meta t-num text-ink-3">{filtered.length} תוצאות</p>
        </div>

        <Panel flush className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו קוד חנות, שם או עיר."
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH className="w-[88px]">קוד</TH>
                    <TH>שם</TH>
                    <TH className="w-[160px]">עיר</TH>
                    <TH className="w-[180px]">טקסט זיהוי</TH>
                    <TH className="w-[120px]" align="end">
                      QR / NFC
                    </TH>
                  </THead>
                  <TBody>
                    {filtered.map((s) => (
                      <TR key={s.id}>
                        <TD>
                          <span className="t-body-strong t-num text-ink">
                            {s.code}
                          </span>
                        </TD>
                        <TD>
                          <span className="t-body text-ink">{s.name}</span>
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
                          <a
                            href={storeWhatsAppDeepLink(s.code)}
                            target="_blank"
                            rel="noreferrer"
                            className="t-body text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                          >
                            פתיחת קישור
                          </a>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden">
                <RowList>
                  {filtered.map((s) => (
                    <a
                      key={s.id}
                      href={storeWhatsAppDeepLink(s.code)}
                      target="_blank"
                      rel="noreferrer"
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
                        </span>
                      </span>
                      <span className="t-caption shrink-0 text-ink-3">
                        WhatsApp
                      </span>
                    </a>
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
