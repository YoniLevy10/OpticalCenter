/**
 * E2E-ish demo script for the Israel pilot (no browser).
 * Run: MAINTAINOS_FORCE_MEMORY=1 npx tsx scripts/e2e-demo.mjs
 * Or rely on vitest demo-flow.test.ts
 */
import { createServer } from 'node:http'

console.log(`
MaintainOS demo script
======================
1) npm run dev
2) Open /ops/simulator
3) Send STORE_172 then "המזגן הראשי לא עובד"
4) Open /ops/tickets → assign technician
5) Open /tech → in_progress → resolved

API shortcut:
  curl -X POST localhost:3000/api/demo/whatsapp -H 'content-type: application/json' -d '{"wa_id":"97250","text":"STORE_172"}'
  curl -X POST localhost:3000/api/demo/whatsapp -H 'content-type: application/json' -d '{"wa_id":"97250","text":"המזגן הראשי לא עובד"}'
  curl 'localhost:3000/api/demo/seed-ticket?assign=1'
`)

// Keep module valid for node without side effects beyond print
void createServer
