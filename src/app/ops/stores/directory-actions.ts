'use server'

import { revalidatePath } from 'next/cache'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { updateStore } from '@/modules/stores/service'
import {
  areaManagerFor,
  listAudits,
  listContacts,
  resolveConflict,
  setAreaManager,
  setContactActive,
  upsertContact,
  verifyContactPhone,
} from '@/lib/data/ops-ledger'

async function editor() {
  const actor = await getServerActor()
  const demo = shouldAllowDemoEntry()
  const ari = actor?.memberships.some((m) => m.role === 'global_admin')
  if (!ari && !demo) throw new Error('עריכת ספר הסניפים שמורה למנהל הרשת')
  return actor?.full_name || 'ארי'
}

export async function directorySnapshot(storeId: string) {
  return {
    contacts: listContacts(storeId),
    areaManager: areaManagerFor(storeId),
    audits: listAudits().filter((row) => row.entityId === storeId || row.entity === 'contact').slice(0, 12),
  }
}

export async function saveStoreCode(storeId: string, code: string) {
  const actor = await editor()
  await updateStore(storeId, { code })
  revalidatePath('/ops/stores')
  return actor
}

export async function saveAreaManager(storeId: string, name: string) {
  const actor = await editor()
  setAreaManager(storeId, name, actor)
  revalidatePath('/ops/stores')
}

export async function saveContact(input: {
  id?: string
  storeId: string
  fullName: string
  phone: string
  roleLabel: string
}) {
  const actor = await editor()
  const existing = input.id ? listContacts().find((row) => row.id === input.id) : null
  const storeIds = existing ? [...new Set([...existing.storeIds, input.storeId])] : [input.storeId]
  upsertContact({
    id: input.id,
    fullName: input.fullName,
    phone: input.phone,
    roleLabel: input.roleLabel,
    storeIds,
    actor,
    phoneStatus: existing?.phoneStatus,
  })
  revalidatePath('/ops/stores')
}

export async function confirmPhone(contactId: string) {
  const actor = await editor()
  verifyContactPhone(contactId, actor)
  revalidatePath('/ops/dashboard')
  revalidatePath('/ops/stores')
}

export async function deactivateContact(contactId: string) {
  const actor = await editor()
  setContactActive(contactId, false, actor)
  revalidatePath('/ops/stores')
}

export async function keepConflict(conflictId: string, keep: 'current' | 'incoming') {
  const actor = await editor()
  resolveConflict(conflictId, keep, actor)
  revalidatePath('/ops/dashboard')
}
