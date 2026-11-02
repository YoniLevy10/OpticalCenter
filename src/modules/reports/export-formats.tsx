import path from 'node:path'
import ExcelJS from 'exceljs'
import React from 'react'
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { QueueTicket } from '@/modules/tickets/queue'
import { computeStoreReport } from '@/modules/ops/dashboard-kpis'
import type { DashboardKpis, SlaReport } from '@/modules/ops/dashboard-kpis'
import {
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { formatIls } from '@/modules/spend/true-cost'

export type ReportExportRow = {
  tickets: QueueTicket[]
  kpis: DashboardKpis
  sla: SlaReport
  from?: string | null
  to?: string | null
  techNames?: Record<string, string>
  /** Recorded amounts only, keyed by ticket id. Missing keys have no price. */
  recorded?: Record<string, number>
  annualCosts?: {
    year: number
    network: number
    stores: { storeName: string; amount: number }[]
  }
}

const INK = '1F1C19'
const TENANT = '8D4B38'
const PAPER = 'F6F3EF'
const LINE = 'E4DDD6'
const MUTED = '6F675F'

const PDF_ROW_CAP = 120
const STORE_CAP = 8

let fontsReady = false

function ensureFonts() {
  if (fontsReady) return
  const dir = path.join(process.cwd(), 'src/assets/fonts')
  try {
    Font.register({
      family: 'Heebo',
      fonts: [
        { src: path.join(dir, 'Heebo-Regular.ttf'), fontWeight: 400 },
        { src: path.join(dir, 'Heebo-Bold.ttf'), fontWeight: 700 },
      ],
    })
  } catch {
    // The family is already registered after a dev reload.
  }
  Font.registerHyphenationCallback((word) => [word])
  fontsReady = true
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const PDF_STATUS: Record<string, string> = {
  new: 'חדשה',
  triaged: 'מסווגת',
  assigned: 'משויכת',
  awaiting_info: 'חסר מידע',
  in_progress: 'בטיפול',
  waiting_vendor: 'ממתינה לספק',
  waiting_parts: 'ממתינה לחלק',
  engaged: 'אושר — החנות מתאמת',
  resolved: 'טופלה',
  closed: 'סגורה',
  cancelled: 'בוטלה',
}

function labelOf(
  map: Record<string, string>,
  key: string | null | undefined,
): string {
  if (!key) return '—'
  return map[key] ?? key
}

function formatStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (day) return `${day[3]}.${day[2]}.${day[1]}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\//g, '.')
}

function issuedOn(now = new Date()): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)
}

function periodPhrase(from?: string | null, to?: string | null): string {
  if (!from && !to) return 'כל התקופה שנבחרה'
  const start = from ? formatStamp(from) : 'ההתחלה'
  const end = to ? formatStamp(to) : 'היום'
  return `מ־${start} עד ${end}`
}

function ticketNumber(ticket: QueueTicket): string {
  if (ticket.display_number) return ticket.display_number
  if (ticket.number != null) return `OC-${ticket.number}`
  return ticket.id.slice(0, 8)
}

function storeName(ticket: QueueTicket): string {
  return ticket.stores?.name?.trim() || ticket.stores?.code || 'ללא סניף'
}

function faultText(ticket: QueueTicket): string {
  const raw = (ticket.title?.trim() || ticket.description || '')
    .replace(/\s+/g, ' ')
    .trim()
  return raw || '—'
}

function assignee(ticket: QueueTicket, names: Record<string, string>): string {
  const id = ticket.assigned_to?.trim()
  if (!id) return 'לא שויך'
  if (names[id]) return names[id]
  if (id.includes('-') && id.length > 20) return 'לא שויך'
  return id
}

function recordedAmount(
  ticket: QueueTicket,
  recorded: Record<string, number> | undefined,
): number | null {
  const amount = recorded?.[ticket.id]
  if (amount == null || amount <= 0) return null
  return Math.round(amount)
}

export type ReportLine = {
  number: string
  store: string
  what: string
  status: string
  statusKey: string
  priority: string
  priorityKey: string
  category: string
  opened: string
  closed: string
  owner: string
  amount: number | null
}

export function reportLines(data: ReportExportRow): ReportLine[] {
  const names = data.techNames ?? {}
  return [...data.tickets]
    .sort((a, b) => {
      const store = storeName(a).localeCompare(storeName(b), 'he')
      if (store !== 0) return store
      const rank =
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
      if (rank !== 0) return rank
      return b.created_at.localeCompare(a.created_at)
    })
    .map((ticket) => ({
      number: ticketNumber(ticket),
      store: storeName(ticket),
      what: faultText(ticket),
      status: labelOf(
        TICKET_STATUS_LABELS_HE as Record<string, string>,
        ticket.status,
      ),
      statusKey: ticket.status,
      priority: labelOf(
        TICKET_PRIORITY_LABELS_HE as Record<string, string>,
        ticket.priority,
      ),
      priorityKey: ticket.priority,
      category: labelOf(TICKET_CATEGORY_LABELS_HE, ticket.category ?? 'other'),
      opened: formatStamp(ticket.created_at),
      closed: formatStamp(ticket.resolved_at),
      owner: assignee(ticket, names),
      amount: recordedAmount(ticket, data.recorded),
    }))
}

function moneySentence(lines: ReportLine[]): string | null {
  const priced = lines.filter((line) => line.amount != null)
  if (priced.length === 0) return null
  const sum = priced.reduce((total, line) => total + (line.amount ?? 0), 0)
  const missing = lines.length - priced.length
  const recorded =
    priced.length === 1
      ? `נרשם ${formatIls(sum)} על תקלה אחת`
      : `נרשמו ${formatIls(sum)} על ${priced.length} תקלות`
  if (missing === 0) return `${recorded}.`
  if (missing === 1) return `${recorded}. לתקלה אחת אין עדיין מחיר.`
  return `${recorded}. ל־${missing} תקלות אין עדיין מחיר.`
}

function leadSentence(
  lines: ReportLine[],
  stores: { name: string; total: number }[],
  categories: { label: string; count: number }[],
  breached: number,
): string {
  if (lines.length === 0) return 'אין תקלות בטווח הזה.'
  const parts: string[] = []
  const store = stores[0]
  const category = categories[0]
  if (store) {
    parts.push(`הכי הרבה תקלות בסניף ${store.name} (${store.total}).`)
  }
  if (category) {
    parts.push(`הסוג הנפוץ הוא ${category.label} (${category.count}).`)
  }
  if (breached === 1) parts.push('תקלה אחת עברה את זמן הטיפול.')
  else if (breached > 1) parts.push(`${breached} עברו את זמן הטיפול.`)
  return parts.join(' ')
}

function categoryCounts(tickets: QueueTicket[]): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const ticket of tickets) {
    const key = ticket.category ?? 'other'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({
      label: TICKET_CATEGORY_LABELS_HE[key] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

function hoursLabel(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `ממוצע עד סגירה: ${text} שעות`
}

function esc(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const CSV_HEADERS = [
  'מספר',
  'סניף',
  'מה קרה',
  'סטטוס',
  'עדיפות',
  'סוג',
  'נפתחה',
  'נסגרה',
  'משויך',
  'נרשם',
]

export function buildTicketsCsv(data: ReportExportRow): string {
  const rows = [
    CSV_HEADERS,
    ...reportLines(data).map((line) => [
      line.number,
      line.store,
      line.what,
      line.status,
      line.priority,
      line.category,
      line.opened,
      line.closed,
      line.owner,
      line.amount == null ? '' : String(line.amount),
    ]),
  ]
  if (data.annualCosts) {
    rows.push([])
    rows.push([`עלויות אחזקה ${data.annualCosts.year}`, 'סכום שאושר'])
    for (const store of data.annualCosts.stores) {
      rows.push([store.storeName, String(store.amount)])
    }
    rows.push(['סה״כ רשת', String(data.annualCosts.network)])
  }
  return `\uFEFF${rows.map((row) => row.map(esc).join(',')).join('\n')}`
}

function paintHeader(row: ExcelJS.Row) {
  row.height = 22
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${TENANT}` },
    }
    cell.alignment = { horizontal: 'right', vertical: 'middle', readingOrder: 'rtl' }
  })
}

function paintBody(cell: ExcelJS.Cell, zebra: boolean) {
  cell.font = { name: 'Arial', size: 11, color: { argb: `FF${INK}` } }
  cell.alignment = {
    horizontal: 'right',
    vertical: 'middle',
    wrapText: true,
    readingOrder: 'rtl',
  }
  if (zebra) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${PAPER}` },
    }
  }
}

export async function buildTicketsXlsx(data: ReportExportRow): Promise<Buffer> {
  const lines = reportLines(data)
  const stores = computeStoreReport(data.tickets)
  const categories = categoryCounts(data.tickets)
  const period = periodPhrase(data.from, data.to)
  const lead = leadSentence(lines, stores, categories, data.kpis.breached)
  const money = moneySentence(lines)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MILO'
  wb.title = 'Optical Center — דוח תפעול'
  wb.created = new Date()

  const summary = wb.addWorksheet('סיכום', {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
    },
  })
  summary.columns = [
    { width: 28 },
    { width: 42 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ]
  summary.mergeCells('A1:E1')
  summary.getCell('A1').value = 'Optical Center'
  summary.getCell('A1').font = {
    name: 'Arial',
    size: 22,
    bold: true,
    color: { argb: `FF${TENANT}` },
  }
  summary.getCell('A1').alignment = { horizontal: 'right', readingOrder: 'rtl' }
  summary.getRow(1).height = 32

  summary.mergeCells('A2:E2')
  summary.getCell('A2').value = 'דוח תפעול'
  summary.getCell('A2').font = {
    name: 'Arial',
    size: 16,
    bold: true,
    color: { argb: `FF${INK}` },
  }
  summary.getCell('A2').alignment = { horizontal: 'right', readingOrder: 'rtl' }

  summary.mergeCells('A3:E3')
  summary.getCell('A3').value = period
  summary.getCell('A3').font = { name: 'Arial', size: 11, color: { argb: `FF${MUTED}` } }
  summary.getCell('A3').alignment = { horizontal: 'right', readingOrder: 'rtl' }

  summary.mergeCells('A5:E5')
  summary.getCell('A5').value = [lead, money].filter(Boolean).join(' ')
  summary.getCell('A5').font = { name: 'Arial', size: 12, color: { argb: `FF${INK}` } }
  summary.getCell('A5').alignment = {
    horizontal: 'right',
    wrapText: true,
    readingOrder: 'rtl',
  }
  summary.getRow(5).height = 36

  const metricHeader = summary.getRow(7)
  metricHeader.values = ['מדד', 'ערך']
  paintHeader(metricHeader)
  const metrics: [string, string | number][] = [
    ['פתוחות', data.kpis.open],
    ['עברו את זמן הטיפול', data.kpis.breached],
    ['נפתרו', data.kpis.resolvedCount],
    [
      'בזמן',
      data.sla.pctWithinSla != null ? `${data.sla.pctWithinSla}%` : '—',
    ],
  ]
  if (data.kpis.avgResolveHours != null) {
    metrics.push(['ממוצע עד סגירה (שעות)', data.kpis.avgResolveHours])
  }
  const priced = lines.filter((line) => line.amount != null)
  if (priced.length > 0) {
    metrics.push([
      'נרשם',
      priced.reduce((total, line) => total + (line.amount ?? 0), 0),
    ])
  }
  metrics.forEach((pair, index) => {
    const row = summary.getRow(8 + index)
    row.values = pair
    row.eachCell((cell) => paintBody(cell, index % 2 === 1))
    row.height = 20
  })

  const storeStart = 8 + metrics.length + 2
  const storeHeader = summary.getRow(storeStart)
  storeHeader.values = ['סניף', 'תקלות', 'פתוחות', 'באיחור']
  paintHeader(storeHeader)
  stores.forEach((store, index) => {
    const row = summary.getRow(storeStart + 1 + index)
    row.values = [store.name, store.total, store.open, store.breached]
    row.eachCell((cell) => paintBody(cell, index % 2 === 1))
  })

  const categoryStart = storeStart + stores.length + 3
  const categoryHeader = summary.getRow(categoryStart)
  categoryHeader.values = ['סוג', 'תקלות']
  paintHeader(categoryHeader)
  categories.forEach((category, index) => {
    const row = summary.getRow(categoryStart + 1 + index)
    row.values = [category.label, category.count]
    row.eachCell((cell) => paintBody(cell, index % 2 === 1))
  })

  const tickets = wb.addWorksheet('תקלות', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })
  tickets.columns = [
    { width: 14 },
    { width: 24 },
    { width: 46 },
    { width: 22 },
    { width: 12 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
  ]
  tickets.mergeCells('A1:J1')
  tickets.getCell('A1').value = 'Optical Center — תקלות'
  tickets.getCell('A1').font = {
    name: 'Arial',
    size: 16,
    bold: true,
    color: { argb: `FF${TENANT}` },
  }
  tickets.getCell('A1').alignment = { horizontal: 'right', readingOrder: 'rtl' }
  tickets.mergeCells('A2:J2')
  tickets.getCell('A2').value = period
  tickets.getCell('A2').font = { name: 'Arial', size: 11, color: { argb: `FF${MUTED}` } }
  tickets.getCell('A2').alignment = { horizontal: 'right', readingOrder: 'rtl' }
  const ticketHeader = tickets.getRow(4)
  ticketHeader.values = CSV_HEADERS
  paintHeader(ticketHeader)
  lines.forEach((line, index) => {
    const row = tickets.getRow(5 + index)
    row.values = [
      line.number,
      line.store,
      line.what,
      line.status,
      line.priority,
      line.category,
      line.opened,
      line.closed,
      line.owner,
      line.amount,
    ]
    row.height = 22
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      paintBody(cell, index % 2 === 1)
      if (col === 10 && typeof cell.value === 'number') {
        cell.numFmt = '"₪"#,##0'
      }
    })
  })
  if (lines.length > 0) {
    tickets.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + lines.length, column: 10 },
    }
  }

  const byStore = wb.addWorksheet('סניפים', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, paperSize: 9 },
  })
  byStore.columns = [
    { width: 28 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ]
  const byStoreHeader = byStore.getRow(1)
  byStoreHeader.values = ['סניף', 'תקלות', 'פתוחות', 'באיחור']
  paintHeader(byStoreHeader)
  stores.forEach((store, index) => {
    const row = byStore.getRow(2 + index)
    row.values = [store.name, store.total, store.open, store.breached]
    row.eachCell((cell) => paintBody(cell, index % 2 === 1))
  })

  if (data.annualCosts) {
    const money = wb.addWorksheet('עלויות', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    })
    money.columns = [{ width: 28 }, { width: 18 }]
    const header = money.getRow(1)
    header.values = ['חנות', `עלות ${data.annualCosts.year}`]
    paintHeader(header)
    data.annualCosts.stores.forEach((store, index) => {
      const row = money.getRow(2 + index)
      row.values = [store.storeName, store.amount]
      row.eachCell((cell) => paintBody(cell, index % 2 === 1))
    })
    const total = money.getRow(2 + data.annualCosts.stores.length)
    total.values = ['סה״כ רשת', data.annualCosts.network]
    total.eachCell((cell) => paintBody(cell, false))
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

const pdf = StyleSheet.create({
  page: {
    fontFamily: 'Heebo',
    fontSize: 9,
    color: '#1f1c19',
    paddingBottom: 36,
  },
  band: {
    backgroundColor: '#8d4b38',
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 28,
  },
  bandTight: {
    backgroundColor: '#8d4b38',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 28,
  },
  brand: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'right',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'right',
    marginTop: 2,
  },
  period: {
    color: '#f6f3ef',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  insight: {
    backgroundColor: '#f6f3ef',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  insightText: {
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 1.45,
  },
  metrics: {
    flexDirection: 'row-reverse',
    marginTop: 12,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e4ddd6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginLeft: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'right',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6f675f',
    textAlign: 'right',
    marginTop: 2,
  },
  note: {
    fontSize: 9,
    color: '#6f675f',
    textAlign: 'right',
    marginTop: 8,
  },
  columns: {
    flexDirection: 'row-reverse',
    marginTop: 16,
  },
  column: { flex: 1, marginLeft: 12 },
  section: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
    marginBottom: 6,
  },
  tableHead: {
    flexDirection: 'row-reverse',
    backgroundColor: '#8d4b38',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e4ddd6',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  zebra: { backgroundColor: '#f6f3ef' },
  headText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 700,
    textAlign: 'right',
  },
  cell: {
    fontSize: 8,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  late: { color: '#8d4b38', fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#6f675f' },
})

function Heb({
  children,
  style,
}: {
  children: string
  style?: React.ComponentProps<typeof Text>['style']
}) {
  return <Text style={style as never}>{children}</Text>
}

function wrapLogical(text: string, maxChars: number, maxLines = 2): string[] {
  const clean = text.replace(/\s+/g, ' ').trim() || '—'
  const words = clean.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if ([...next].length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const last = kept[maxLines - 1] ?? ''
  const room = Math.max(1, maxChars - 1)
  kept[maxLines - 1] = `${[...last].slice(0, room).join('')}…`
  return kept
}

function HebBlock({
  text,
  max,
  lines = 2,
  style,
}: {
  text: string
  max: number
  lines?: number
  style?: React.ComponentProps<typeof Text>['style']
}) {
  return (
    <View>
      {wrapLogical(text, max, lines).map((line, index) => (
        <Text key={`${index}-${line}`} style={style as never}>
          {line}
        </Text>
      ))}
    </View>
  )
}

function MiniTable({
  headers,
  rows,
  flex,
}: {
  headers: string[]
  rows: string[][]
  flex: number[]
}) {
  return (
    <View>
      <View style={pdf.tableHead}>
        {headers.map((header, index) => (
          <View key={header} style={{ flex: flex[index] ?? 1, paddingHorizontal: 2 }}>
            <Heb style={pdf.headText}>{header}</Heb>
          </View>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={`${row[0]}-${rowIndex}`}
          style={rowIndex % 2 === 1 ? [pdf.tableRow, pdf.zebra] : pdf.tableRow}
        >
          {row.map((cell, index) => (
            <View key={`${cell}-${index}`} style={{ flex: flex[index] ?? 1, paddingHorizontal: 2 }}>
              <HebBlock text={cell} max={index === 0 ? 18 : 8} style={pdf.cell} />
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function Footer({ issued }: { issued: string }) {
  return (
    <View style={pdf.footer} fixed>
      <Heb style={pdf.footerText}>Optical Center · MILO</Heb>
      <Text
        style={pdf.footerText}
        render={({ pageNumber, totalPages }) =>
          `עמוד ${pageNumber} מתוך ${totalPages}`
        }
      />
      <Heb style={pdf.footerText}>{`הופק ${issued}`}</Heb>
    </View>
  )
}

function ReportPdfDocument({
  data,
  issued,
}: {
  data: ReportExportRow
  issued: string
}) {
  const lines = reportLines(data)
  const stores = computeStoreReport(data.tickets)
  const categories = categoryCounts(data.tickets)
  const period = periodPhrase(data.from, data.to)
  const lead = leadSentence(lines, stores, categories, data.kpis.breached)
  const money = moneySentence(lines)
  const shown = lines.slice(0, PDF_ROW_CAP)
  const hidden = lines.length - shown.length
  const pages: ReportLine[][] = []
  for (let i = 0; i < shown.length; i += 15) pages.push(shown.slice(i, i + 15))
  const within =
    data.sla.pctWithinSla != null ? `${data.sla.pctWithinSla}%` : '—'
  const storeRows = stores.slice(0, STORE_CAP).map((store) => [
    store.name,
    String(store.total),
    String(store.open),
    String(store.breached),
  ])
  const categoryRows = categories.slice(0, STORE_CAP).map((category) => [
    category.label,
    String(category.count),
  ])

  return (
    <Document
      title="Optical Center — דוח תפעול"
      author="MILO"
      language="he"
    >
      <Page size="A4" style={pdf.page}>
        <View style={pdf.band}>
          <Heb style={pdf.brand}>Optical Center · MILO</Heb>
          <Heb style={pdf.title}>דוח תפעול</Heb>
          <Heb style={pdf.period}>{period}</Heb>
        </View>
        <View style={pdf.body}>
          <View style={pdf.insight}>
            <HebBlock text={lead} max={78} lines={3} style={pdf.insightText} />
            {money ? (
              <HebBlock text={money} max={78} lines={2} style={pdf.note} />
            ) : null}
          </View>
          <View style={pdf.metrics}>
            {[
              [String(data.kpis.open), 'פתוחות', false],
              [String(data.kpis.breached), 'באיחור', data.kpis.breached > 0],
              [String(data.kpis.resolvedCount), 'נפתרו', false],
              [within, 'בזמן', false],
            ].map(([value, label, hot]) => (
              <View key={String(label)} style={pdf.metric}>
                <Text style={hot ? [pdf.metricValue, pdf.late] : pdf.metricValue}>
                  {String(value)}
                </Text>
                <Heb style={pdf.metricLabel}>{String(label)}</Heb>
              </View>
            ))}
          </View>
          {data.kpis.avgResolveHours != null ? (
            <Heb style={pdf.note}>{hoursLabel(data.kpis.avgResolveHours)}</Heb>
          ) : null}
          <View style={pdf.columns}>
            <View style={pdf.column}>
              <Heb style={pdf.section}>סניפים</Heb>
              {storeRows.length > 0 ? (
                <MiniTable
                  headers={['סניף', 'תקלות', 'פתוחות', 'באיחור']}
                  rows={storeRows}
                  flex={[2.2, 1, 1, 1]}
                />
              ) : (
                <Heb style={pdf.cell}>אין סניפים בטווח.</Heb>
              )}
              {stores.length > STORE_CAP ? (
                <Heb style={pdf.note}>{`ועוד ${stores.length - STORE_CAP} סניפים בגיליון.`}</Heb>
              ) : null}
            </View>
            <View style={pdf.column}>
              <Heb style={pdf.section}>סוגי תקלות</Heb>
              {categoryRows.length > 0 ? (
                <MiniTable
                  headers={['סוג', 'תקלות']}
                  rows={categoryRows}
                  flex={[2.4, 1]}
                />
              ) : (
                <Heb style={pdf.cell}>אין תקלות בטווח.</Heb>
              )}
            </View>
          </View>
        </View>
        <Footer issued={issued} />
      </Page>
      {pages.map((pageLines, pageIndex) => (
        <Page key={pageLines[0]?.number ?? pageIndex} size="A4" style={pdf.page}>
          <View style={pdf.bandTight}>
            <Heb style={pdf.brand}>Optical Center · דוח תפעול</Heb>
            <Heb style={pdf.period}>{period}</Heb>
          </View>
          <View style={pdf.body}>
            <Heb style={pdf.section}>
              {pageIndex === 0 ? 'התקלות' : 'התקלות, המשך'}
            </Heb>
            <View style={pdf.tableHead}>
              {['מספר', 'סניף', 'מה קרה', 'סטטוס', 'עדיפות', 'נפתחה', 'נרשם'].map(
                (header, index) => (
                  <View
                    key={header}
                    style={{
                      flex: [1.1, 1.6, 2.6, 1.3, 0.9, 1, 1][index],
                      paddingHorizontal: 2,
                    }}
                  >
                    <Heb style={pdf.headText}>{header}</Heb>
                  </View>
                ),
              )}
            </View>
            {pageLines.map((line, index) => (
              <View
                key={line.number}
                style={index % 2 === 1 ? [pdf.tableRow, pdf.zebra] : pdf.tableRow}
              >
                <View style={{ flex: 1.1, paddingHorizontal: 2 }}>
                  <Heb style={pdf.cell}>{line.number}</Heb>
                </View>
                <View style={{ flex: 1.6, paddingHorizontal: 2 }}>
                  <HebBlock text={line.store} max={16} style={pdf.cell} />
                </View>
                <View style={{ flex: 2.6, paddingHorizontal: 2 }}>
                  <HebBlock text={line.what} max={28} style={pdf.cell} />
                </View>
                <View style={{ flex: 1.3, paddingHorizontal: 2 }}>
                  <HebBlock
                    text={PDF_STATUS[line.statusKey] ?? line.status}
                    max={14}
                    style={pdf.cell}
                  />
                </View>
                <View style={{ flex: 0.9, paddingHorizontal: 2 }}>
                  <Text
                    style={
                      line.priorityKey === 'critical' || line.priorityKey === 'high'
                        ? [pdf.cell, pdf.late]
                        : pdf.cell
                    }
                  >
                    {line.priority}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 2 }}>
                  <Heb style={pdf.cell}>{line.opened}</Heb>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 2 }}>
                  <Heb style={pdf.cell}>
                    {line.amount != null ? formatIls(line.amount) : '—'}
                  </Heb>
                </View>
              </View>
            ))}
            {pageIndex === pages.length - 1 && hidden > 0 ? (
              <Heb style={pdf.note}>
                {`מוצגות ${shown.length} תקלות מתוך ${lines.length}. הרשימה המלאה בגיליון.`}
              </Heb>
            ) : null}
          </View>
          <Footer issued={issued} />
        </Page>
      ))}
    </Document>
  )
}

export async function buildTicketsPdf(data: ReportExportRow): Promise<Buffer> {
  ensureFonts()
  const buffer = await renderToBuffer(
    <ReportPdfDocument data={data} issued={issuedOn()} />,
  )
  return Buffer.from(buffer)
}
