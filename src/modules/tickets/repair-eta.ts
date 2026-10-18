/** B04 — repair ETA visible to HQ and store. */

export const REPAIR_ETA_REQUIRED_HE = 'נדרש מועד הגעה משוער תקין'
export const REPAIR_ETA_SET_EVENT = 'repair_eta_set'

export function parseRepairEta(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function formatRepairEtaHe(
  etaAt: string | Date | null | undefined,
  now: Date = new Date(),
): string | null {
  const eta = parseRepairEta(etaAt)
  if (!eta) return null
  const sameDay =
    eta.getFullYear() === now.getFullYear() &&
    eta.getMonth() === now.getMonth() &&
    eta.getDate() === now.getDate()
  const time = eta.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (sameDay) return `היום ב־${time}`
  const date = eta.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return `${date} · ${time}`
}

export function isEtaOverdue(
  etaAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const eta = parseRepairEta(etaAt)
  if (!eta) return false
  return eta.getTime() < now.getTime()
}
