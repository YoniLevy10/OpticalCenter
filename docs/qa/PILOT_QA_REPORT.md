# MaintainOS Pilot QA Report

**Branch:** `cursor/mobile-pwa-qa` (QA suite added)  
**Date:** 2026-08-15  
**Scope:** Infrastructure + automated suite + audit (no mass product fixes)  
**Default backend under test:** Memory (`MAINTAINOS_FORCE_MEMORY=1`)  
**Commands:**

```bash
npm test
npm run test:e2e          # chromium (build + Playwright)
npm run test:e2e:all      # chromium + webkit + mobile projects
npm run test:qa           # lint + typecheck + unit + e2e + build
npm run test:qa:load      # 800 stores / 10k tickets synthetic bottleneck report
```

**Latest local run:** lint ✓ · typecheck ✓ · unit 66 pass + 4 expected-fail · e2e chromium 21 pass · build ✓ · load report written.

---

## Pilot readiness — five scenarios

| # | Scenario | Verdict |
|---|----------|---------|
| 1 | Unknown employee → identify store → report → one ticket | **PASS** (Memory Golden Path + WA-02/04/05) |
| 2 | Known employee → issue/photo only → auto store | **FAIL / BLOCKED on Memory** — `resolveStoreByWaId` requires Supabase `store_phones` |
| 3 | HQ finds issue, urgency, assigns tech | **PASS** (Golden Path + filters) |
| 4 | Tech PWA: open → start → evidence → resolve | **PASS** (Golden Path; photo URL path) |
| 5 | Scoped user cannot access other scope via API | **FAIL (P0)** — service role + permissive RLS + unscoped tech GET |

**Overall:** **Not pilot-ready** until P0 security + known-phone (Supabase) parity are fixed.

---

## P0 — Pilot blockers

### P0-1 — No real tenant RBAC / RLS

- **Test:** `src/modules/security/rls-scanner.test.ts` (expected fail), hierarchy scanner  
- **Repro:** Read `supabase/migrations/20260815220000_initial_schema.sql` policies `*_authenticated … using (true)`; app uses `createAdminClient()` (service role bypasses RLS).  
- **Expected:** Country/region/store scoped policies; API enforces membership.  
- **Actual:** Authenticated read/update blanket true; service role for HQ/tech/WhatsApp.  
- **Root cause:** Bootstrap skeleton never replaced with membership-scoped RLS; no session auth on ticket APIs.  
- **Proposed fix:** Membership claims → RLS; replace service-role page data with user-scoped clients; deny-by-default.  
- **Files:** `supabase/migrations/20260815220000_initial_schema.sql`, `src/lib/supabase/admin.ts`, `src/app/api/tickets/**`, `src/app/api/tech/**`

### P0-2 — Tech IDOR (unscoped GET)

- **Test:** `e2e/security-idor.spec.ts` (desired deny expected-fail + documentation tests)  
- **Repro:** `GET /api/tech/tickets/{anyUuid}` without auth → 200.  
- **Expected:** 401/403 without verified technician identity.  
- **Actual:** Any ticket id readable; PATCH trusts body `techId`.  
- **Root cause:** No auth; identity is client-supplied UUID.  
- **Proposed fix:** Session/magic-link for techs; bind `techId` server-side; authorize GET by assignee/pool rules.  
- **Files:** `src/app/api/tech/tickets/[id]/route.ts`, `src/modules/tickets/tech.ts`

### P0-3 — HQ ticket PATCH unauthenticated

- **Test:** `e2e/security-idor.spec.ts` documents 200 without session  
- **Expected:** Authn + authz for assign/status.  
- **Actual:** Open PATCH.  
- **Proposed fix:** Require Supabase session + role before `assign`/`updateStatus`.  
- **Files:** `src/app/api/tickets/[id]/route.ts`

### P0-4 — Hierarchy not enforced in DB

- **Test:** `src/modules/security/hierarchy.test.ts` (expected fail)  
- **Expected:** Ticket cannot reference store from another country/region.  
- **Actual:** Columns exist; no composite FK/trigger for same-country.  
- **Proposed fix:** Constraints/triggers; validate on createTicket.  
- **Files:** migrations, `src/modules/tickets/service.ts`, intake create path

### P0-5 — Dangerous “smoke” classification gap

- **Test:** `classify-pilot.test.ts` expected-fail for `עשן יוצא מהשקע`  
- **Expected:** critical/high.  
- **Actual:** `other` / `medium`.  
- **Proposed fix:** Add smoke/fire/electrical-hazard keywords before default.  
- **Files:** `src/modules/tickets/classify.ts`

### P0-6 — WA-01 known phone / WA-12 multi-country

- **WA-01:** Memory always asks store for unknown mapping; production needs seeded `store_phones` + Supabase parity tests.  
- **WA-12:** Memory DEMO_COUNTRY only; no FR phone_number_id fixture.  
- **Proposed fix:** Seed phones; force country from WhatsApp `phone_number_id`; add `@supabase` golden path in CI when secrets present.

---

## P1 — Must fix before real usage

### P1-1 — List/search capped at ~100 then filtered in memory

- **Evidence:** `docs/qa/LOAD_REPORT.json`, `listTickets(limit=100)`, `/ops/tickets` page filters.  
- **Impact:** Search/filters miss older tickets at scale.  
- **Fix:** Server-side filtered queries + indexes.

### P1-2 — Memory vs Supabase intake parity

| Concern | Memory | Supabase |
|---------|--------|----------|
| Known phone | No | `store_phones` |
| Attachments table | message `media_url` only | `ticket_attachments` |
| Dedupe | process Set | `processed_webhooks` |
| Country resolve | DEMO | `countries.whatsapp_phone_number_id` |

### P1-3 — `fetchTechTickets` ignored FORCE_MEMORY (fixed minimally)

- **Was:** Empty Supabase result short-circuited memory → empty tech list while HQ memory had tickets.  
- **Fix applied (QA enablement only):** respect `supabaseReady()` in `fetchTechTickets` / `fetchTechTicket`.  
- **Note:** Still no auth; only backend selection.

### P1-4 — Offline mutation queue absent

- E2E abort path shows error text (honest UX) — good.  
- No retry queue / idempotency keys for double-tap beyond best-effort UI disable.

### P1-5 — Webhook signature optional when secret unset

- Dev allows unsigned webhooks (`verifyWhatsAppSignature` returns true).  
- Production must require `WHATSAPP_APP_SECRET`.

### P1-6 — Physical iPhone PWA checklist still manual

- See `docs/mobile-qa-checklist.md` — not executed on device in this run.

---

## P2 — Polish

- Screenshot baselines committed under `e2e/**/*.png` (soft threshold 12%).  
- Design leftovers: simulator/login Quiet-ified earlier; grep may still find isolated one-offs.  
- `test:e2e:all` (webkit/mobile) not required for default `test:qa` (chromium gate).  
- Concurrent double-assign / webhook race not fully stress-tested beyond dedupe WA-09.

---

## Passed (important)

- WhatsApp STORE_172 → description → **one** ticket (unit + e2e).  
- One-shot `STORE_172 המזגן…` creates ticket.  
- Duplicate `messageId` does not create second ticket (memory).  
- Invalid store recoverable (WA-06).  
- Image+text / image-only no crash.  
- Lifecycle invalid transitions throw at service layer.  
- Reopen `resolved → in_progress` clears `resolved_at`.  
- SLA windows + breach boundaries (−1s / exact / +1s).  
- Golden Path browser: HQ list/detail → assign → tech → in_progress → resolve.  
- Search/filter querystrings on desktop table.  
- Nav desktop + mobile More drawer; no horizontal overflow at 5 viewports.  
- Axe: no **critical** on `/ops/tickets` (contrast rule disabled).  
- PWA manifests + PNG icons reachable.  
- Signature unit tests (valid/invalid/missing when secret set).

---

## Intentional Memory vs Supabase differences

1. Known employee phone mapping — Supabase only.  
2. `ticket_attachments` rows — Supabase only (Memory keeps media on messages).  
3. Durable webhook dedupe — Supabase `processed_webhooks` vs in-process Set.  
4. Country-by-phone_number_id — Supabase; Memory DEMO_COUNTRY.  
5. Realtime — Supabase only.

---

## Load report summary (`npm run test:qa:load`)

- Synthetic **800 stores / 10,000 tickets** in-process.  
- Dominant product risk: **UI/API cap 100** + in-memory filter (P1).  
- Hierarchy cross-country possible in synthetic data (P0 schema).  
- Artifact: [`docs/qa/LOAD_REPORT.json`](LOAD_REPORT.json)

---

## Fix priority (after you accept this report)

1. **P0:** AuthZ (RLS + API), tech/HQ IDOR, hierarchy constraints, smoke classification, WA-01/WA-12 fixtures.  
2. **P1:** Server-side search, parity, webhook secret enforcement, device PWA pass.  
3. **P2:** Visual polish, broader browser matrix, concurrency hardening.

**Do not treat green `test:qa` as pilot-ready** — expected-fail security tests encode the deny posture that is still missing in production code.
