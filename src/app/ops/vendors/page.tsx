import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { VendorsAdmin } from './vendors-admin'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageHeader
          className="hidden md:flex"
          title="ספקים חיצוניים"
          meta="Partner dispatch · HMAC"
        />
        <VendorsAdmin />
      </div>
    </OpsAppShell>
  )
}
