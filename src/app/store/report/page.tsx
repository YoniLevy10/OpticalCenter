import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { primaryStoreId, shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { fetchStores } from '@/modules/stores/data'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { StoreReportForm } from './store-report-form'

export const dynamic = 'force-dynamic'

export default async function StoreReportPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { stores } = await fetchStores()
  const storeId = actor ? primaryStoreId(actor) : null
  const locked = storeId
    ? stores.find((s) => s.id === storeId)
    : stores.find((s) => s.code === '172') ?? stores[0]

  if (!locked) {
    return (
      <Panel elevated className="px-5 py-6">
        <p className="t-body text-ink-2">לא נמצאה חנות משויכת לחשבון.</p>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-5 stagger">
      <OpsPageHero
        eyebrow={`#${locked.code}`}
        title="דיווח תקלה"
        status={`${locked.name} — תארו מה קרה ונטפל`}
      />
      <Panel elevated className="px-4 py-5 md:px-5">
        <StoreReportForm
          storeCode={locked.code}
          storeName={locked.name}
          locked
        />
      </Panel>
    </div>
  )
}
