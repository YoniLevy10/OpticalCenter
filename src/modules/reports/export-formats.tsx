import ExcelJS from 'exceljs'
import React from 'react'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { QueueTicket } from '@/modules/tickets/queue'
import type { DashboardKpis, SlaReport } from '@/modules/ops/dashboard-kpis'
import {
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'

export type ReportExportRow = {
  tickets: QueueTicket[]
  kpis: DashboardKpis
  sla: SlaReport
  from?: string | null
  to?: string | null
}

function ticketRows(tickets: QueueTicket[]): string[][] {
  return tickets.map((t) => [
    t.display_number ?? (t.number != null ? `OC-${t.number}` : t.id),
    TICKET_STATUS_LABELS_HE[t.status as keyof typeof TICKET_STATUS_LABELS_HE] ??
      t.status,
    TICKET_PRIORITY_LABELS_HE[
      t.priority as keyof typeof TICKET_PRIORITY_LABELS_HE
    ] ?? t.priority,
    TICKET_CATEGORY_LABELS_HE[t.category ?? 'other'] ?? t.category ?? '',
    t.stores?.code ?? '',
    t.stores?.name ?? '',
    t.created_at,
    t.resolved_at ?? '',
    t.assigned_to ?? '',
  ])
}

export async function buildTicketsXlsx(data: ReportExportRow): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MaintainOS'

  const summary = wb.addWorksheet('סיכום')
  summary.views = [{ rightToLeft: true }]
  summary.addRow(['MaintainOS — דוח תקלות'])
  summary.addRow(['מתאריך', data.from ?? '—', 'עד', data.to ?? '—'])
  summary.addRow([])
  summary.addRow(['פתוחות', data.kpis.open])
  summary.addRow(['חריגות SLA', data.kpis.breached])
  summary.addRow(['נפתרו', data.kpis.resolvedCount])
  summary.addRow([
    'ממוצע פתרון (שעות)',
    data.kpis.avgResolveHours ?? '—',
  ])
  summary.addRow(['% בתוך SLA', data.sla.pctWithinSla ?? '—'])

  const tickets = wb.addWorksheet('תקלות')
  tickets.views = [{ rightToLeft: true }]
  tickets.addRow([
    'מספר',
    'סטטוס',
    'עדיפות',
    'קטגוריה',
    'קוד חנות',
    'שם חנות',
    'נוצר',
    'נפתר',
    'טכנאי',
  ])
  for (const row of ticketRows(data.tickets)) {
    tickets.addRow(row)
  }

  const stores = wb.addWorksheet('לפי חנות')
  stores.views = [{ rightToLeft: true }]
  stores.addRow(['קוד', 'שם', 'סה״כ'])
  for (const s of data.kpis.topStores) {
    stores.addRow([s.code, s.name, s.count])
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#444' },
})

function ReportPdfDocument({ data }: { data: ReportExportRow }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>MaintainOS — דוח תקלות</Text>
        <Text>
          תקופה: {data.from ?? '—'} — {data.to ?? '—'}
        </Text>
        <View style={{ marginTop: 16 }}>
          {[
            ['פתוחות', String(data.kpis.open)],
            ['חריגות SLA', String(data.kpis.breached)],
            ['נפתרו', String(data.kpis.resolvedCount)],
            [
              'ממוצע פתרון',
              data.kpis.avgResolveHours != null
                ? `${data.kpis.avgResolveHours} שע׳`
                : '—',
            ],
            [
              '% בתוך SLA',
              data.sla.pctWithinSla != null ? `${data.sla.pctWithinSla}%` : '—',
            ],
          ].map(([label, value]) => (
            <View key={label} style={pdfStyles.row}>
              <Text style={pdfStyles.label}>{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={{ marginTop: 20, fontSize: 10, color: '#666' }}>
          {data.tickets.length} תקלות בטווח · Optical Center · MaintainOS
        </Text>
      </Page>
    </Document>
  )
}

export async function buildTicketsPdf(data: ReportExportRow): Promise<Buffer> {
  return renderToBuffer(<ReportPdfDocument data={data} />)
}
