export type PilotSample = {
  openedAt: string
  resolvedAt: string | null
  approvalRequestedAt: string | null
  approvalDecidedAt: string | null
  reachedAriOutsideSystem: boolean
  repeatedFault: boolean
  ingestedClean: boolean
  correctedManually: boolean
}

export type PilotMetrics = {
  medianResolveHours: number | null
  medianApprovalHours: number | null
  outsideSystem: number
  repeats: number
  cleanIngestRate: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!
}

function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000
}

export function computePilotMetrics(samples: PilotSample[]): PilotMetrics {
  const resolve = samples
    .filter((row) => row.resolvedAt)
    .map((row) => hoursBetween(row.openedAt, row.resolvedAt!))
  const approval = samples
    .filter((row) => row.approvalRequestedAt && row.approvalDecidedAt)
    .map((row) => hoursBetween(row.approvalRequestedAt!, row.approvalDecidedAt!))
  const ingest = samples.filter((row) => row.ingestedClean || row.correctedManually)
  const clean = ingest.filter((row) => row.ingestedClean && !row.correctedManually).length
  return {
    medianResolveHours: median(resolve),
    medianApprovalHours: median(approval),
    outsideSystem: samples.filter((row) => row.reachedAriOutsideSystem).length,
    repeats: samples.filter((row) => row.repeatedFault).length,
    cleanIngestRate: ingest.length ? clean / ingest.length : null,
  }
}
