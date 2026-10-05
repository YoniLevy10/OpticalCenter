'use server'

import { revalidatePath } from 'next/cache'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { assign, updateStatus } from '@/modules/tickets/service'
import { applySpendDecision } from '@/lib/data/ops-ledger'
import { persistOpsLedger } from '@/lib/data/ops-db'
import { notifyPhone } from '@/modules/notify/ari'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'

async function allow() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    throw new Error('נדרשת כניסה')
  }
  return actor
}

export async function assignFromQueue(ticketId: string, technicianId: string) {
  const actor = await allow()
  await assign(ticketId, technicianId, actor?.id ?? null)
  revalidatePath('/ops/dashboard')
}

export async function requestInfoFromQueue(ticketId: string) {
  const actor = await allow()
  await updateStatus(ticketId, 'awaiting_info', actor?.id ?? null)
  revalidatePath('/ops/dashboard')
}

export async function approveSpendFromQueue(spendId: string) {
  const actor = await allow()
  if (actor && !actor.memberships.some((m) => m.role === 'global_admin')) {
    throw new Error('אישור הוצאה שמור למנהל הרשת')
  }
  const spend = applySpendDecision(spendId, 'approved', actor?.full_name || 'ארי')
  const store = ISRAEL_STORES.find((row) => row.code === spend.storeCode)
  if (store?.managerPhone) {
    await notifyPhone(
      store.managerPhone,
      `סניף ${spend.storeCode}: הבקשה «${spend.reason}» אושרה.`,
    )
  }
  await persistOpsLedger()
  revalidatePath('/ops/dashboard')
  revalidatePath('/ops/approvals')
}
