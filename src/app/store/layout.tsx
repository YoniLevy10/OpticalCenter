import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import {
  primaryStoreId,
  shouldAllowDemoEntry,
} from '@/lib/auth/home-path'
import { hqRoles } from '@/lib/auth/types'
import { fetchStores } from '@/modules/stores/data'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login?next=/store')

  if (actor) {
    const isStoreStaff = actor.memberships.some(
      (m) => m.role === 'store_employee' || m.role === 'store_manager',
    )
    const isHq = actor.memberships.some((m) => hqRoles().includes(m.role))
    if (!isStoreStaff && !shouldAllowDemoEntry()) {
      redirect(isHq ? '/ops/dashboard' : '/login')
    }
  }

  let storeName: string | undefined
  let storeCode: string | undefined
  if (actor) {
    const sid = primaryStoreId(actor) ?? actor.memberships.find((m) => m.store_id)?.store_id
    if (sid) {
      const { stores } = await fetchStores()
      const store = stores.find((s) => s.id === sid)
      storeName = store?.name
      storeCode = store?.code
    }
  }

  const { StoreShell } = await import('@/components/layout/store-shell')
  return (
    <StoreShell storeName={storeName} storeCode={storeCode}>
      {children}
    </StoreShell>
  )
}
