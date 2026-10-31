import { writeFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { QueueTicket } from '@/modules/tickets/queue'
import type { DashboardKpis, SlaReport } from '@/modules/ops/dashboard-kpis'
import {
  buildTicketsCsv,
  buildTicketsPdf,
  buildTicketsXlsx,
} from '@/modules/reports/export-formats'

function ticket(partial: Partial<QueueTicket> & Pick<QueueTicket, 'id'>): QueueTicket {
  return {
    status: 'in_progress',
    priority: 'high',
    description: '',
    created_at: '2026-10-12T08:00:00.000Z',
    ...partial,
  }
}

const tickets: QueueTicket[] = [
  ticket({
    id: 'trial-hvac',
    display_number: 'OC-18004',
    category: 'hvac',
    title: 'המזגן באולם לא מקרר',
    priority: 'high',
    stores: { code: '6037', name: 'ירושלים כיכר ציון' },
    assigned_to: 'tech-1',
  }),
  ticket({
    id: 'trial-elec',
    display_number: 'OC-18001',
    category: 'electrical',
    description: 'לוח החשמל קופץ',
    priority: 'critical',
    status: 'new',
    stores: { code: '6001', name: 'חיפה הרצל' },
    assigned_to: '11111111-1111-1111-1111-111111111111',
  }),
]

const data = {
  tickets,
  kpis: {
    open: 2,
    breached: 1,
    resolvedCount: 0,
    avgResolveHours: 14,
  } as DashboardKpis,
  sla: { pctWithinSla: 86 } as SlaReport,
  from: '2026-10-01',
  to: '2026-10-31',
  techNames: { 'tech-1': 'דנה כהן' },
  recorded: { 'trial-hvac': 2400 },
}

describe('report export', () => {
  it('builds a csv a person can read', () => {
    const csv = buildTicketsCsv(data)
    expect(csv.startsWith('\uFEFFמספר,סניף,מה קרה')).toBe(true)
    expect(csv).toContain('המזגן באולם לא מקרר')
    expect(csv).toContain('דנה כהן')
    expect(csv).toContain('2400')
    expect(csv).not.toContain('11111111-1111-1111-1111-111111111111')
    expect(csv).toContain('12.10.2026')
  })

  it('builds a workbook with a cover and the fault', async () => {
    const buf = await buildTicketsXlsx(data)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    expect(wb.getWorksheet('סיכום')?.getCell('A1').value).toBe('Optical Center')
    expect(wb.getWorksheet('סיכום')?.getCell('A2').value).toBe('דוח תפעול')
    expect(String(wb.getWorksheet('סיכום')?.getCell('A5').value)).toContain(
      'ירושלים כיכר ציון',
    )
    expect(String(wb.getWorksheet('סיכום')?.getCell('A5').value)).toContain('₪2,400')
    const faults = wb.getWorksheet('תקלות')
    const values = faults?.getSheetValues().flat().map((cell) => String(cell ?? ''))
    expect(values?.some((cell) => cell.includes('המזגן באולם לא מקרר'))).toBe(true)
    expect(values?.some((cell) => cell.includes('דנה כהן'))).toBe(true)
    expect(values?.join(' ')).not.toContain('11111111')
  })

  it('builds a pdf with a real font', async () => {
    const pdf = await buildTicketsPdf(data)
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(8_000)
    if (process.env.REPORT_PREVIEW) {
      writeFileSync('/tmp/optical-center-report.pdf', pdf)
      writeFileSync('/tmp/optical-center-report.xlsx', await buildTicketsXlsx(data))
    }
  })
})
