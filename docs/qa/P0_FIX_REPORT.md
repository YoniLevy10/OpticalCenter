# P0 Fix Sprint Report — MaintainOS / Optical Center

**Date:** 2026-08-15  
**Branch:** `cursor/mobile-pwa-qa`  
**Goal:** Close pilot blockers (auth, RLS, integrity, hazards, WA routing, webhook strictness). No P1 polish.

## Verification commands

```bash
npm run lint      # pass
npm run typecheck # pass
npm test          # 83 pass
npm run test:e2e  # 25 chromium pass
npm run build     # pass
```

**Expected-fail P0 tests remaining:** **0**

---

## Fixed P0 blockers

| ID | Topic | Result |
|----|--------|--------|
| **P0-1** | AuthN/AuthZ on HQ + tech ticket APIs; no client `techId` SoT | **PASS** |
| **P0-2** | Replace permissive RLS (`using (true)`) with membership scope | **PASS** (migration) |
| **P0-3** | Remove service-role from normal user intent; audit leftovers | **PASS** (audit below; residual documented) |
| **P0-4** | Hierarchy integrity (DB triggers + service validation) | **PASS** |
| **P0-5** | Critical hazard classification (conservative rules) | **PASS** |
| **P0-6** | Known phone + multi-country WA + prod webhook signature | **PASS** |

---

## Security model

```
User
  → session (Supabase cookie) OR demo/E2E (Bearer test_<uuid> / mos_test_actor)
  → memberships (role + org/country/region/store)
  → API decision (canReadTicket / canMutateHqTicket / canTechActOnTicket)
  → Supabase RLS (can_read_ticket / can_mutate_hq_ticket) when using user client
```

**Rules**

- Anonymous → `401` on tech/HQ ticket GET/PATCH.
- Wrong technician → `403` (not allowed to read/patch another tech’s assigned ticket).
- HQ roles scoped by country / region / store; global admin sees org.
- Technician identity for mutations comes from authenticated actor — client `techId` is ignored.
- Demo middleware sets `mos_test_actor` only when `MAINTAINOS_FORCE_MEMORY=1` or `MAINTAINOS_ALLOW_TEST_AUTH=1` (UI convenience; APIs still require session/bearer).

---

## Service-role audit

| Location | Client | Justification |
|----------|--------|----------------|
| `src/modules/whatsapp/intake.ts` | `createSystemClient('whatsapp_intake')` | Trusted inbound webhook/intake pipeline |
| `src/modules/tickets/service.ts` | `createSystemClient('tickets_service')` | Server ticket CRUD used by intake + authenticated API after authz gate; memory mode bypasses DB |
| `src/modules/tech/service.ts` | `createSystemClient('tech_attachment_insert')` | Persist tech photo after authz |
| `src/lib/auth/request-actor.ts` | `createSystemClient('auth_memberships')` | Load memberships after identity established |
| `src/lib/data/memory-store.ts` `supabaseReady()` | `createAdminClient()` | Readiness probe only |
| `src/modules/tickets/tech.ts` SSR fetch | `createAdminClient()` | **Residual:** tech SSR list/detail still uses admin when Supabase ready — should move to `createUserClient` + RLS after real login UX |
| `src/modules/stores/data.ts` | `createAdminClient()` | **Residual:** store catalog for ops SSR |
| `src/app/api/demo/seed-*` | `createAdminClient()` | Demo/seed system ops (not pilot user path) |
| `src/lib/supabase/system.ts` / `admin.ts` | wraps service role | Explicit system boundary |

**Not for normal browser trust:** service role must not be the authorization mechanism. API routes now enforce actor + membership; RLS migration provides defense-in-depth for session-scoped clients.

---

## Database integrity

Migration: `supabase/migrations/20260815230000_p0_rls_hierarchy_france.sql`

**Triggers**

- `enforce_ticket_hierarchy` / `trg_tickets_hierarchy` — ticket org/country/region must match store; asset must belong to ticket store.
- `enforce_store_region_country` / `trg_stores_region_country` — store region must belong to store country.

**RLS**

- Dropped bootstrap `*_authenticated … using (true)`.
- Added scoped policies + `can_read_ticket` / `can_mutate_hq_ticket`.
- Default posture: deny unless membership matches.

**Fixtures**

- France country + region IDF + store code `172` (Paris Opéra).
- IL WhatsApp phone number id seed.
- Known employee `972501112233` → IL store 172 via `store_phones`.

**Service layer**

- `assertStoreHierarchy`, `resolveMemoryStore`, asset↔store check, negative tests for IL store + FR countryCode.

---

## WhatsApp routing

1. **`phone_number_id` → country**  
   Lookup `countries.whatsapp_phone_number_id` (memory: `wa_phone_il_demo` / `wa_phone_fr_demo`).  
   Unknown id → fail safe (`country_missing`), **no IL guess** on production path.

2. **`wa_id` → store**  
   `store_phones` (memory seed for known employee). Country-scoped; remapping = update/delete+insert `store_phones` row when employee moves stores.

3. **Fallback → store code**  
   Parse `172` / `STORE_172` within the **already resolved country**, then create ticket for that country’s store (`IL 172` ≠ `FR 172`).

4. **Webhook signature**  
   Production-like (`NODE_ENV=production` without force-memory / bypass, or `MAINTAINOS_WA_PROD_STRICT=1`): missing secret or unsigned → reject (`401`). Dev/demo may bypass intentionally.

---

## Remaining risks (genuine)

1. **SSR pages** (ops tickets list, tech list) still may use service-role/admin when Supabase is connected — API is locked; full page-level session+RLS for SSR is next hardening step before multi-tenant production.
2. **No full login UX** yet — pilot demo uses test auth flags / middleware cookie; real Supabase Auth login must replace this before non-demo users.
3. **Migration must be applied** to the live Supabase project (`npm run db:migrate`) — verified here via SQL tests + memory backend.
4. **Hazard rules are keyword-based** — conservative (false-high preferred); not an AI classifier; may miss novel phrasings or over-escalate edge cases.
5. **External provider** scope is assignment-based only; richer vendor ACLs not built.

---

## Definition of Done checklist

1. Anonymous cannot read/update internal tickets via API — **yes**  
2. Technician cannot access another technician’s ticket — **yes**  
3. Store/region/country scope server-side + DB RLS — **yes**  
4. Cross-hierarchy ticket data rejected — **yes** (trigger + service)  
5. Dangerous electrical/fire cases escalate — **yes**  
6. Known employee reports without store ask — **yes** (WA-01)  
7. Two countries can share store code `172` — **yes** (WA-12)  
8. Production WhatsApp webhooks require valid signature — **yes**  
9. All P0 expected-fail tests flipped to passing deny/security tests — **yes**

**P1 work must not start until this remains green.**
