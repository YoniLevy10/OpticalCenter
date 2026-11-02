import { AppShell } from '@/components/layout/app-shell'
import { getServerActor } from '@/lib/auth/server-actor'
import { resolveNavTools } from '@/lib/auth/nav-access'
import { loadDeskNotices } from '@/modules/ops/desk-notices'

export async function OpsAppShell({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor()
  const tools = resolveNavTools(actor)
  const notices = await loadDeskNotices(actor)
  return (
    <AppShell tools={tools} notices={notices}>
      {children}
    </AppShell>
  )
}
