import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { AssetScanClient } from './scan-client'

export const dynamic = 'force-dynamic'

export default async function AssetScanPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/assets"
          backLabel="חזרה לציוד"
          title="סריקת ציוד"
          meta="מצב נייד רציף"
        />
        <AssetScanClient />
      </div>
    </OpsAppShell>
  )
}
