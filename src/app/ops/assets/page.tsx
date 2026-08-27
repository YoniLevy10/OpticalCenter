import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { AssetsAdmin, type AssetTicketHint } from './assets-admin'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const [{ stores }, ticketResult] = await Promise.all([
    fetchStores({ includeInactive: true }),
    listTickets(500).catch(() => ({
      tickets: [],
      backend: 'memory' as const,
    })),
  ])

  const tickets: AssetTicketHint[] = (ticketResult.tickets ?? []).map((t) => ({
    id: t.id,
    store_id: t.store_id,
    asset_id: (t as { asset_id?: string | null }).asset_id ?? null,
    status: t.status,
    title: (t as { title?: string | null }).title ?? null,
    description: t.description,
    created_at: t.created_at,
    display_number: t.display_number,
    number: t.number,
  }))

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/settings"
          backLabel="חזרה להגדרות"
          title="נכסים"
          meta="ציוד לפי סניף"
          showRefresh
        />
        <PageHeader
          title="נכסים"
          description="חיפוש לפי שם או סידורי, סינון סטטוס, ו-QR נגיש לכל נכס."
          meta="ציוד לפי סניף"
          className="hidden md:flex"
        />
        <AssetsAdmin
          stores={stores.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
          }))}
          tickets={tickets}
        />
      </div>
    </OpsAppShell>
  )
}
