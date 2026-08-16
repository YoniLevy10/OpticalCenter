#!/usr/bin/env node
/**
 * Large-dataset / load smoke for MaintainOS QA.
 * Generates synthetic timing report without mutating production DB.
 * Default: Memory-oriented analysis of listTickets limit + in-memory filter risk.
 *
 * Usage: npm run test:qa:load
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const STORE_COUNT = Number(process.env.QA_LOAD_STORES || 800)
const TICKET_COUNT = Number(process.env.QA_LOAD_TICKETS || 10000)

function synthStores(n) {
  const out = []
  for (let i = 1; i <= n; i++) {
    out.push({
      id: `load-store-${i}`,
      code: String(1000 + (i % 9000)),
      name: `חנות עומס ${i}`,
      city: i % 2 ? 'תל אביב' : 'ירושלים',
      country: i % 5 === 0 ? 'FR' : 'IL',
      region: `r-${i % 20}`,
    })
  }
  return out
}

function synthTickets(n, stores) {
  const statuses = ['new', 'assigned', 'in_progress', 'waiting_parts', 'resolved', 'closed']
  const priorities = ['critical', 'high', 'medium', 'low']
  const out = []
  for (let i = 1; i <= n; i++) {
    const store = stores[i % stores.length]
    out.push({
      id: `load-ticket-${i}`,
      display_number: `OC-${20000 + i}`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      description: `תקלת עומס מספר ${i} מזגן/נורה/דלת`,
      store_code: store.code,
      store_name: store.name,
      country: store.country,
    })
  }
  return out
}

function filterTickets(tickets, { status, q }) {
  return tickets.filter((t) => {
    if (status === 'open' && ['resolved', 'closed', 'cancelled'].includes(t.status)) {
      return false
    }
    if (status && status !== 'open' && t.status !== status) return false
    if (q) {
      const hay = `${t.display_number} ${t.description} ${t.store_name} ${t.store_code}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })
}

function main() {
  const t0 = performance.now()
  const stores = synthStores(STORE_COUNT)
  const tStores = performance.now()
  const tickets = synthTickets(TICKET_COUNT, stores)
  const tTickets = performance.now()

  // Simulate current product: only first 100 tickets available to UI
  const pageSlice = tickets.slice(0, 100)
  const tSlice = performance.now()

  const filteredOpen = filterTickets(pageSlice, { status: 'open' })
  const filteredQ = filterTickets(pageSlice, { q: 'מזגן' })
  const fullScan = filterTickets(tickets, { q: 'OC-25000' })
  const tFilter = performance.now()

  const payloadBytes = Buffer.byteLength(JSON.stringify(pageSlice), 'utf8')

  const report = {
    generated_at: new Date().toISOString(),
    config: { STORE_COUNT, TICKET_COUNT },
    timings_ms: {
      synth_stores: +(tStores - t0).toFixed(2),
      synth_tickets: +(tTickets - tStores).toFixed(2),
      slice_100: +(tSlice - tTickets).toFixed(2),
      filters: +(tFilter - tSlice).toFixed(2),
      total: +(tFilter - t0).toFixed(2),
    },
    observations: [
      'Product listTickets() currently caps ~100 rows then filters in memory — search cannot see tickets beyond the cap.',
      'At 10k tickets, full client/server in-memory scan of the full set is possible in Node but not exposed by API.',
      'Multi-country stores in this synthetic set are not enforced by DB constraints in initial schema.',
      'N+1 risk: ticket detail loads messages/events; list pages should avoid per-row detail fetches.',
    ],
    metrics: {
      stores: stores.length,
      tickets: tickets.length,
      ui_cap_simulated: pageSlice.length,
      open_in_cap: filteredOpen.length,
      q_mazgan_in_cap: filteredQ.length,
      full_scan_hits: fullScan.length,
      list_payload_bytes_cap100: payloadBytes,
    },
    bottlenecks: [
      {
        id: 'LIST_CAP_100',
        severity: 'P1',
        detail: 'In-memory filter after limit=100 makes search/filters incomplete at scale.',
      },
      {
        id: 'NO_SERVER_SEARCH',
        severity: 'P1',
        detail: 'No DB ilike/indexed search path for ticket number/store/description.',
      },
      {
        id: 'HIERARCHY_CONSTRAINTS',
        severity: 'P0',
        detail: 'Synthetic cross-country rows possible; schema lacks same-country enforcement.',
      },
    ],
  }

  mkdirSync('docs/qa', { recursive: true })
  writeFileSync('docs/qa/LOAD_REPORT.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('\nWrote docs/qa/LOAD_REPORT.json')
}

main()
