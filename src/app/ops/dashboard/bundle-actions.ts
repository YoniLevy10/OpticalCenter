'use server'

import { revalidatePath } from 'next/cache'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { decideBundleVisit, requestBundleVisit, type BundleRequest } from '@/modules/recommendations/commit'

async function allow() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    return { actor: null, error: 'נדרשת כניסה' as const }
  }
  return { actor, error: null }
}

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message && !err.message.includes('NEXT_REDIRECT')) {
    return err.message
  }
  return 'הפעולה נכשלה'
}

export async function sendBundleApproval(
  input: BundleRequest,
): Promise<{ error: string | null; notice: string | null }> {
  const gate = await allow()
  if (gate.error) return { error: gate.error, notice: null }
  try {
    await hydrateOpsLedger()
    const ordered = await requestBundleVisit(input, gate.actor?.full_name || 'ארי')
    revalidatePath('/ops/dashboard')
    revalidatePath('/ops/approvals')
    revalidatePath('/ops/tasks')
    return { error: null, notice: ordered.notice }
  } catch (err) {
    return { error: messageOf(err), notice: null }
  }
}

export async function approveBundleNow(
  spendId: string,
): Promise<{ error: string | null; notice: string | null }> {
  const gate = await allow()
  if (gate.error) return { error: gate.error, notice: null }
  const actor = gate.actor
  if (
    actor &&
    !actor.memberships.some((m) =>
      ['global_admin', 'global_maintenance', 'country_manager'].includes(m.role),
    )
  ) {
    return { error: 'אישור הזמנה שמור למנהל הרשת', notice: null }
  }
  try {
    await hydrateOpsLedger()
    const result = await decideBundleVisit({
      spendId,
      approve: true,
      actor: actor?.full_name || 'ארי',
    })
    revalidatePath('/ops/dashboard')
    revalidatePath('/ops/approvals')
    revalidatePath('/ops/tickets')
    return { error: null, notice: result.reply }
  } catch (err) {
    return { error: messageOf(err), notice: null }
  }
}
