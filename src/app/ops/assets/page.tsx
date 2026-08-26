import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { AssetsAdmin } from './assets-admin'
import { fetchStores } from '@/modules/stores/data'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { stores } = await fetchStores()

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageHeader
          className="hidden md:flex"
          title="נכסים"
          meta="ציוד לפי חנות"
        />
        <AssetsAdmin
          stores={stores.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
          }))}
        />
      </div>
    </OpsAppShell>
  )
}
