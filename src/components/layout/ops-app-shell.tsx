import { AppShell } from '@/components/layout/app-shell'
import { getServerActor } from '@/lib/auth/server-actor'
import { resolveNavTools } from '@/lib/auth/nav-access'

export async function OpsAppShell({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor()
  const tools = resolveNavTools(actor)
  return <AppShell tools={tools}>{children}</AppShell>
}
