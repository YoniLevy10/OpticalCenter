import { PublicReportForm } from './report-form'
import { fetchStores } from '@/modules/stores/data'

export const dynamic = 'force-dynamic'

export default async function PublicReportPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>
}) {
  const sp = await searchParams
  const { stores } = await fetchStores()
  const initial =
    (sp.store ?? '').trim() ||
    stores.find((s) => s.code === '172')?.code ||
    stores[0]?.code ||
    ''

  return (
    <div className="dvh-screen safe-pt safe-pb bg-canvas px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-1)]">
            <span className="t-section" aria-hidden>
              OC
            </span>
          </div>
          <h1 className="t-title text-ink">דיווח תקלה</h1>
          <p className="t-body mt-1 text-ink-2">
            Optical Center · MaintainOS
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
          <PublicReportForm
            initialStore={initial}
            stores={stores.map((s) => ({ code: s.code, name: s.name }))}
          />
        </div>
      </div>
    </div>
  )
}
