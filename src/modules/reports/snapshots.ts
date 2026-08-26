import { createSystemClient } from '@/lib/supabase/system'
import { supabaseReady } from '@/lib/data/memory-store'
import type { DashboardKpis, SlaReport } from '@/modules/ops/dashboard-kpis'

export type ReportSnapshotRow = {
  id: string
  organization_id: string
  period_start: string
  period_end: string
  label: string
  format: string
  kpis_json: Record<string, unknown>
  created_by: string | null
  created_at: string
}

const MEM_ORG = '11111111-1111-1111-1111-111111111111'
const memSnapshots: ReportSnapshotRow[] = []

export async function listReportSnapshots(
  organizationId: string,
): Promise<{ snapshots: ReportSnapshotRow[]; backend: 'supabase' | 'memory' }> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('report_snapshots_list')
    const { data, error } = await supabase
      .from('report_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (!error && data) {
      return { snapshots: data as ReportSnapshotRow[], backend: 'supabase' }
    }
  }

  return {
    backend: 'memory',
    snapshots: memSnapshots
      .filter((s) => s.organization_id === organizationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}

export async function createReportSnapshot(input: {
  organizationId: string
  periodStart: string
  periodEnd: string
  label: string
  format: string
  kpis: DashboardKpis
  sla: SlaReport
  createdBy?: string | null
}): Promise<ReportSnapshotRow> {
  const kpis_json = {
    open: input.kpis.open,
    breached: input.kpis.breached,
    resolvedCount: input.kpis.resolvedCount,
    avgResolveHours: input.kpis.avgResolveHours,
    pctWithinSla: input.sla.pctWithinSla,
    topStores: input.kpis.topStores,
    ticketCount: input.kpis.resolvedCount + input.kpis.open,
  }

  if (await supabaseReady()) {
    const supabase = createSystemClient('report_snapshots_insert')
    const { data, error } = await supabase
      .from('report_snapshots')
      .insert({
        organization_id: input.organizationId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        label: input.label,
        format: input.format,
        kpis_json,
        created_by: input.createdBy ?? null,
      })
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'שמירת דוח נכשלה')
    return data as ReportSnapshotRow
  }

  const row: ReportSnapshotRow = {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    label: input.label,
    format: input.format,
    kpis_json,
    created_by: input.createdBy ?? null,
    created_at: new Date().toISOString(),
  }
  memSnapshots.unshift(row)
  return row
}

export function defaultOrganizationId(): string {
  return MEM_ORG
}
