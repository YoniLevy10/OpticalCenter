#!/usr/bin/env node
/**
 * Print pilot readiness from a running deployment (default: production).
 *
 *   node scripts/pilot-readiness.mjs
 *   node scripts/pilot-readiness.mjs https://optical-center-rose.vercel.app
 */
const base = (process.argv[2] || 'https://optical-center-rose.vercel.app').replace(
  /\/$/,
  '',
)

const res = await fetch(`${base}/api/health/pilot`)
const json = await res.json()
console.log(JSON.stringify(json, null, 2))
console.log('\n---')
console.log(
  json.buildSideReady
    ? 'Build side: READY'
    : 'Build side: NOT READY — see nextSteps where owner=build',
)
console.log(
  json.metaSideReady
    ? 'Meta side: READY'
    : 'Meta side: waiting on WhatsApp Business / phone number id',
)
console.log(
  json.readyForPilot
    ? 'Overall: READY FOR STORE PILOT'
    : 'Overall: NOT READY',
)
process.exit(json.readyForPilot ? 0 : 2)
