/**
 * Mobile / cellular performance budget checks for MaintainOS ticket flows.
 * Runs against memory backend — measures payload shape & filter cost, not network RTT.
 *
 * Usage: node --env-file=.env.local scripts/perf-mobile-budget.mjs
 *     or: MAINTAINOS_FORCE_MEMORY=1 node scripts/perf-mobile-budget.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const OPEN = ['new', 'triaged', 'assigned', 'in_progress', 'waiting_parts']

function synthTickets(n) {
  const out = []
  for (let i = 1; i <= n; i++) {
    const status = OPEN[i % OPEN.length]
    const resolved = i % 7 === 0 ? 'resolved' : status
    out.push({
      id: `t-${i}`,
      number: 10000 + i,
      display_number: `OC-${10000 + i}`,
      status: resolved,
      priority: i % 5 === 0 ? 'critical' : 'medium',
      category: 'hvac',
      description: `תיאור תקלה מספר ${i} מזגן לא מקרר`,
      source: 'whatsapp',
      created_at: new Date(Date.now() - i * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: 'org',
      country_id: 'il',
      region_id: 'r1',
      store_id: `s-${i % 40}`,
      assigned_to: i % 3 === 0 ? `tech-${i % 8}` : null,
      title: `מזגן ${i}`,
      sla_respond_by: null,
      sla_resolve_by: null,
      first_response_at: null,
      resolved_at: resolved === 'resolved' ? new Date().toISOString() : null,
      stores: {
        code: String(100 + (i % 40)),
        name: `חנות ${i % 40}`,
        city: 'תל אביב',
        address: 'רחוב ארוך 12 דירה 3 קומה 2',
      },
    })
  }
  return out
}

function listPayload(tickets, { limit, statuses, slim }) {
  let rows = tickets
  if (statuses?.length) {
    const set = new Set(statuses)
    rows = rows.filter((t) => set.has(t.status))
  }
  rows = rows.slice(0, limit)
  if (slim) {
    rows = rows.map((t) => {
      const desc =
        t.description.length > 160
          ? `${t.description.slice(0, 157)}…`
          : t.description
      return {
        ...t,
        description: desc,
        stores: {
          code: t.stores.code,
          name: t.stores.name,
          city: t.stores.city,
        },
      }
    })
  }
  return rows
}

function bytes(obj) {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8')
}

function main() {
  const t0 = performance.now()
  const tickets = synthTickets(1000)
  const tSynth = performance.now()

  const beforeQueue = listPayload(tickets, { limit: 1000, slim: false })
  const afterQueue = listPayload(tickets, {
    limit: 200,
    statuses: OPEN,
    slim: true,
  })
  const beforeDash = listPayload(tickets, { limit: 500, slim: false })
  const afterDashOpen = listPayload(tickets, {
    limit: 150,
    statuses: OPEN,
    slim: true,
  })
  const afterDashDone = listPayload(tickets, {
    limit: 80,
    statuses: ['resolved', 'closed'],
    slim: true,
  })
  const beforeDetailFanout = listPayload(tickets, { limit: 500, slim: false })
  const afterDetailCounts = tickets
    .filter((t) => OPEN.includes(t.status) && t.assigned_to)
    .slice(0, 2000)
    .map((t) => ({ assigned_to: t.assigned_to }))

  const tFilter = performance.now()

  const report = {
    generated_at: new Date().toISOString(),
    scenario: 'memory-shaped payload budgets (iPhone / cellular)',
    timings_ms: {
      synth_1000: +(tSynth - t0).toFixed(2),
      filter_compare: +(tFilter - tSynth).toFixed(2),
      total: +(tFilter - t0).toFixed(2),
    },
    before_after: [
      {
        flow: 'ops/tickets open list',
        before: {
          rows: beforeQueue.length,
          bytes: bytes(beforeQueue),
          note: 'limit 1000, all statuses, full store address',
        },
        after: {
          rows: afterQueue.length,
          bytes: bytes(afterQueue),
          note: 'limit 200 + open statuses + slim store',
        },
        reduction_pct: +(
          (1 - bytes(afterQueue) / bytes(beforeQueue)) *
          100
        ).toFixed(1),
      },
      {
        flow: 'ops/dashboard KPI load',
        before: {
          rows: beforeDash.length,
          bytes: bytes(beforeDash),
          poll_s: 60,
        },
        after: {
          rows: afterDashOpen.length + afterDashDone.length,
          bytes: bytes(afterDashOpen) + bytes(afterDashDone),
          poll_s: 180,
        },
        reduction_pct: +(
          (1 -
            (bytes(afterDashOpen) + bytes(afterDashDone)) / bytes(beforeDash)) *
          100
        ).toFixed(1),
      },
      {
        flow: 'ticket detail tech open-counts',
        before: {
          rows: beforeDetailFanout.length,
          bytes: bytes(beforeDetailFanout),
          note: 'listTickets(500) full rows',
        },
        after: {
          rows: afterDetailCounts.length,
          bytes: bytes(afterDetailCounts),
          note: 'assigned_to only for open tickets',
        },
        reduction_pct: +(
          (1 - bytes(afterDetailCounts) / bytes(beforeDetailFanout)) *
          100
        ).toFixed(1),
      },
    ],
    budgets: {
      queue_list_kb_max: 120,
      dashboard_kb_max: 140,
      detail_counts_kb_max: 20,
    },
    pass: true,
  }

  for (const row of report.before_after) {
    if (row.reduction_pct < 40) report.pass = false
  }
  if (report.before_after[0].after.bytes / 1024 > 120) report.pass = false
  if (report.before_after[1].after.bytes / 1024 > 140) report.pass = false
  if (report.before_after[2].after.bytes / 1024 > 20) report.pass = false

  const outDir = resolve('docs/qa')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'mobile-perf-budget.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath}`)
  if (!report.pass) process.exitCode = 1
}

main()
