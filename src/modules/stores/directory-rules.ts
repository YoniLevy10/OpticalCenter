/** Keep codes and phones as text so a leading zero is never dropped. */
export function asTextCode(value: string): string {
  return value.trim()
}

export type FieldLock = {
  field: string
  locked: boolean
  needsVerification: boolean
}

export type SyncProposal =
  | { action: 'apply'; value: string }
  | { action: 'conflict'; current: string; incoming: string; field: string }

/**
 * A future sync must not overwrite Ari's manual correction.
 * Unverified phones are also left untouched until he confirms them.
 */
export function proposeSyncedValue(input: {
  field: string
  current: string
  incoming: string
  locked: boolean
  needsVerification: boolean
}): SyncProposal {
  const current = asTextCode(input.current)
  const incoming = asTextCode(input.incoming)
  if (current === incoming) return { action: 'apply', value: current }
  if (input.locked || input.needsVerification) {
    return { action: 'conflict', current, incoming, field: input.field }
  }
  return { action: 'apply', value: incoming }
}

export function assertUniqueStoreCode(
  stores: { id: string; code: string }[],
  code: string,
  exceptId?: string,
): void {
  const next = asTextCode(code)
  const clash = stores.find((s) => s.code === next && s.id !== exceptId)
  if (clash) throw new Error(`חנות עם קוד ${next} כבר קיימת`)
}

/** Code is a label. Links stay on the store id. */
export function relabelStoreCode<T extends { id: string; code: string }>(
  store: T,
  nextCode: string,
  others: { id: string; code: string }[],
): T {
  const code = asTextCode(nextCode)
  assertUniqueStoreCode(others, code, store.id)
  return { ...store, code }
}

export type StoreContactLink = {
  contactId: string
  fullName: string
  phone: string
  storeIds: string[]
}

/** Shared name or phone must not drop a store link. */
export function linkContactToStore(
  contact: StoreContactLink,
  storeId: string,
): StoreContactLink {
  if (contact.storeIds.includes(storeId)) return contact
  return { ...contact, storeIds: [...contact.storeIds, storeId] }
}
