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
import { StoreRowActions } from './store-row-actions'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function activityLabel(isActive: boolean | undefined, openCount: number) {
  if (isActive === false) return { text: 'מושבת', tone: 'muted' as const }
  if (openCount > 0) return { text: 'פעיל · תקלות', tone: 'warn' as const }
  return { text: 'פעיל', tone: 'ok' as const }
}

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; status?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const region = (sp.region ?? '').trim()
  const status = (sp.status ?? '').trim()
  const { stores, fromDb } = await fetchStores({ includeInactive: true })

  const { tickets } = await listTickets(500).catch(() => ({
    tickets: [],
    backend: 'memory' as const,
  }))

  const openCountByStore = new Map<string, number>()
  for (const t of tickets) {
    if (t.source === 'demo') continue
    if (
      t.status === 'closed' ||
      t.status === 'cancelled' ||
      t.status === 'resolved'
    ) {
      continue
    }
    openCountByStore.set(t.store_id, (openCountByStore.get(t.store_id) ?? 0) + 1)
  }

  const regions = Array.from(
    new Set(
      stores
        .map((s) => s.city?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'he'))

  const filtered = stores.filter((s) => {
    if (q) {
      const hay = `${s.code} ${s.name} ${s.city ?? ''} ${s.address ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (region && (s.city ?? '') !== region) return false
    if (status === 'active' && s.is_active === false) return false
    if (status === 'inactive' && s.is_active !== false) return false
    return true
  })

  const canMutate =
    actor?.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'country_manager',
    ) || shouldAllowDemoEntry()

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="חנויות"
          meta={
            <span className="t-num">
              {filtered.length}
              {!fromDb ? ' · דמו' : ''}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/ops/stores/print-qr">הדפסת QR</Link>
              </Button>
              {canMutate ? <StoreCreateForm /> : null}
            </div>
          }
        />

        <StoreSearch
          initialQ={sp.q ?? ''}
          initialRegion={region}
          initialStatus={status}
          regions={regions}
        />

        <div className="sm:hidden">
          <Button asChild variant="ghost" size="touch" className="min-h-[var(--tap)]">
            <Link href="/ops/stores/print-qr">הדפסת QR</Link>
          </Button>
        </div>

        <Panel flush elevated className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו קוד, שם, עיר או שנו את הסינון."
              icon={Store}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH>שם</TH>
                    <TH className="w-[88px]">קוד</TH>
                    <TH className="w-[88px]" align="end">
                      פתוחות
                    </TH>
                    <TH className="w-[120px]">סטטוס</TH>
                    <TH className="w-[160px]">איש קשר</TH>
                    <TH className="w-[148px]" align="end">
                      פעולות
                    </TH>
                  </THead>
                  <TBody>
                    {filtered.map((s) => {
                      const openCount = openCountByStore.get(s.id) ?? 0
                      const activity = activityLabel(s.is_active, openCount)
                      return (
                        <TR key={s.id}>
                          <TD>
                            <Link
                              href={`/ops/stores/${encodeURIComponent(s.code)}`}
                              className="t-body-strong text-ink underline-offset-2 hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.city ? (
                              <span className="t-caption mt-0.5 block text-ink-3">
                                {s.city}
                              </span>
                            ) : null}
                          </TD>
                          <TD>
                            <span className="t-body-strong t-num text-ink">
                              {s.code}
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
                              className={cn(
                                't-caption',
                                activity.tone === 'ok' && 'text-[var(--signal-resolved)]',
                                activity.tone === 'warn' && 'text-[var(--signal-warning)]',
                                activity.tone === 'muted' && 'text-ink-3',
                              )}
                            >
                              {activity.text === 'פעיל · תקלות'
                                ? 'תקלות'
                                : activity.text}
                            </span>
                          </TD>
                          <TD>
                            <span className="t-body text-ink-2">
                              {s.address?.trim() || s.city || '—'}
                            </span>
                          </TD>
                          <TD align="end">
                            <StoreRowActions code={s.code} canEdit={canMutate} />
                          </TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              </div>

              <StoresMobileList
                canEdit={canMutate}
                stores={filtered.map((s) => ({
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  city: s.city,
                  address: s.address,
                  is_active: s.is_active,
                  openCount: openCountByStore.get(s.id) ?? 0,
                }))}
              />
            </>
          )}
        </Panel>
      </div>
    </OpsAppShell>
  )
}
