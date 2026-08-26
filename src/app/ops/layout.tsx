import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { actorIsStoreEmployeeOnly, shouldAllowDemoEntry } from '@/lib/auth/home-path'

/** Block store-only staff from HQ shell routes. */
export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await getServerActor()
  if (!actor && shouldAllowDemoEntry()) return children
  if (actor && actorIsStoreEmployeeOnly(actor)) {
    redirect('/store')
  }
  return children
}
