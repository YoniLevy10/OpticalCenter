import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
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
        <PageToolbar
          backHref="/ops/settings"
          backLabel="חזרה להגדרות"
          title="ספקים חיצוניים"
          meta="Partner dispatch · HMAC"
          showRefresh
        />
        <PageHeader
          title="ספקים חיצוניים"
          meta="Partner dispatch · HMAC"
          className="hidden md:flex"
        />
        <VendorsAdmin />
      </div>
    </OpsAppShell>
  )
}
