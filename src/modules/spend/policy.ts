export type SpendStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'

export type SpendRequest = {
  id: string
  storeId: string
  storeCode: string
  storeName: string
  ticketId: string | null
  reason: string
  vendorName: string | null
  requestedAmount: number
  approvedAmount: number | null
  actualAmount: number | null
  scope: string | null
  status: SpendStatus
  urgent: boolean
  requestedBy: string | null
  decidedBy: string | null
  decidedAt: string | null
  needsReapproval: boolean
  createdAt: string
  updatedAt: string
  /** WhatsApp sender to answer after Ari decides. */
  originWaId?: string | null
}

export function canExecuteSpend(spend: SpendRequest | null | undefined): boolean {
  if (!spend) return false
  return spend.status === 'approved' && !spend.needsReapproval
}

export function executionBlockReason(spend: SpendRequest | null | undefined): string | null {
  if (!spend) return 'נדרש אישור של ארי לפני הוצאה או התחייבות'
  if (spend.needsReapproval) return 'הסכום, הספק או ההיקף השתנו — נדרש אישור מחדש'
  if (spend.status === 'pending') return 'הבקשה ממתינה לאישור'
  if (spend.status === 'needs_info') return 'ארי ביקש מידע נוסף לפני אישור'
  if (spend.status === 'rejected') return 'הבקשה נדחתה'
  if (spend.status !== 'approved') return 'אין אישור לביצוע'
  return null
}

/** A change to amount, vendor, or scope after approval returns the request to Ari. */
export function withCommercialChange(
  spend: SpendRequest,
  patch: { requestedAmount?: number; vendorName?: string | null; scope?: string | null },
  now = new Date().toISOString(),
): SpendRequest {
  const amountChanged =
    patch.requestedAmount != null && patch.requestedAmount !== spend.requestedAmount
  const vendorChanged =
    patch.vendorName !== undefined && (patch.vendorName || null) !== (spend.vendorName || null)
  const scopeChanged =
    patch.scope !== undefined && (patch.scope || null) !== (spend.scope || null)
  const material = amountChanged || vendorChanged || scopeChanged
  const wasApproved = spend.status === 'approved'
  return {
    ...spend,
    requestedAmount: patch.requestedAmount ?? spend.requestedAmount,
    vendorName: patch.vendorName === undefined ? spend.vendorName : patch.vendorName,
    scope: patch.scope === undefined ? spend.scope : patch.scope,
    status: wasApproved && material ? 'pending' : spend.status,
    needsReapproval: wasApproved && material ? true : spend.needsReapproval,
    approvedAmount: wasApproved && material ? null : spend.approvedAmount,
    updatedAt: now,
  }
}

export function invoiceVariance(spend: SpendRequest): boolean {
  if (spend.actualAmount == null || spend.approvedAmount == null) return false
  return spend.actualAmount > spend.approvedAmount
}

export function decideSpend(
  spend: SpendRequest,
  decision: 'approved' | 'rejected' | 'needs_info',
  actor: string,
  approvedAmount?: number | null,
  now = new Date().toISOString(),
): SpendRequest {
  return {
    ...spend,
    status: decision,
    approvedAmount:
      decision === 'approved'
        ? (approvedAmount ?? spend.requestedAmount)
        : spend.approvedAmount,
    needsReapproval: false,
    decidedBy: actor,
    decidedAt: now,
    updatedAt: now,
  }
}
