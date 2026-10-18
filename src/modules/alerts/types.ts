/**
 * Client-safe alert types and pure UI helpers.
 * Keep this free of `@/lib/auth/*` (and anything that pulls `node:crypto`).
 */

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

/** UI buckets for Ari’s daily scan. */
export type AlertBucket = 'urgent_overdue' | 'needs_decision' | 'waiting'

export type AlertSource =
  | 'ticket'
  | 'spend'
  | 'document'
  | 'verify'
  | 'task'
  | 'conflict'
  | 'store_confirm'

export type OpsAlert = {
  /** Stable dedupe key = underlying item (`ticket:…`, `spend:…`, …). */
  id: string
  source: AlertSource
  title: string
  reasons: string[]
  severity: AlertSeverity
  owner: string
  /** ISO timestamp from the freshest contributing source. */
  at: string
  nextAction: string
  href: string
  bucket: AlertBucket
  storeCode: string
  storeName: string
  ticketId?: string
  spendId?: string
}

export type AlertMessage = {
  id: string
  at: string
  summary: string
  href: string | null
  ticketId?: string
}

export type AlertSourceHealth = {
  tickets: 'ok' | 'failed'
  ledger: 'ok' | 'failed'
  history: 'ok' | 'failed'
}

export type AlertsCenterResult = {
  open: OpsAlert[]
  history: AlertMessage[]
  sources: AlertSourceHealth
  /** True when at least one live source failed — UI must not claim “all quiet”. */
  partialFailure: boolean
}

export function filterAlerts(
  alerts: OpsAlert[],
  filters: {
    bucket?: AlertBucket | 'all' | 'open'
    storeCode?: string | null
    source?: AlertSource | 'all'
    q?: string | null
  },
): OpsAlert[] {
  const q = filters.q?.trim().toLowerCase() ?? ''
  const store = filters.storeCode?.trim() ?? ''
  return alerts.filter((alert) => {
    if (filters.bucket && filters.bucket !== 'all' && filters.bucket !== 'open') {
      if (alert.bucket !== filters.bucket) return false
    }
    if (store && alert.storeCode !== store) return false
    if (filters.source && filters.source !== 'all' && alert.source !== filters.source) {
      return false
    }
    if (!q) return true
    const hay = [
      alert.title,
      alert.owner,
      alert.nextAction,
      alert.storeCode,
      alert.storeName,
      ...alert.reasons,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function splitAlertBuckets(
  alerts: OpsAlert[],
): Record<AlertBucket, OpsAlert[]> {
  return {
    urgent_overdue: alerts.filter((a) => a.bucket === 'urgent_overdue'),
    needs_decision: alerts.filter((a) => a.bucket === 'needs_decision'),
    waiting: alerts.filter((a) => a.bucket === 'waiting'),
  }
}
