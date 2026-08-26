import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { primaryStoreId, shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { fetchStores } from '@/modules/stores/data'
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
      <p className="t-body text-ink-2">לא נמצאה חנות משויכת לחשבון.</p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-title text-ink">דיווח תקלה</h1>
        <p className="t-body mt-1 text-ink-2">
          {locked.name} · #{locked.code}
        </p>
      </div>
      <StoreReportForm
        storeCode={locked.code}
        storeName={locked.name}
        locked
      />
    </div>
  )
}
