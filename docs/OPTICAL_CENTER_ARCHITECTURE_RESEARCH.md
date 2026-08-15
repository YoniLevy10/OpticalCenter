# Optical Center Maintenance — Architecture Research & Recommendation

**Status:** Research complete — **STOP before implementation**  
**Date:** 2026-08-15  
**Scope:** Audit existing systems, propose architecture/UX/reuse — no production code changes yet.

---

## Access caveat (critical)

The production Bamakor **application source is not in any repository accessible to this agent**.

| What we found | What we could not open |
|---------------|------------------------|
| Live app: `https://bamakor.vercel.app` (title: «במקור — ניהול תקלות ואחזקה») | Private Bamakor app Git repo |
| Supabase ref in live bundle: `jsliqlmjksintyigkulq` | Server-side WhatsApp bot source |
| Public: `YoniLevy10/Bamakor_site` (marketing Wayback scrape) | RLS policies / migrations |
| Fixly Partner API contract documenting Bamakor as SoT | Meta webhook conversation engine internals |
| Minified client bundles → domain, statuses, nav, APIs | AI classification logic (if any) |

**Implication:** Bamakor conclusions below are based on (1) live UI reverse-engineering, (2) Fixly integration docs, (3) related products — not a full source audit. **Please grant access to the Bamakor app repo before implementation** so WhatsApp intake / RLS / ticket engine can be verified line-by-line.

Also: `shtunz-rgb/bamakor.project` is a **different product** (Wikidata birthplace quiz PWA named «במקור.פרוג׳קט»). Do not confuse it with Bamakor maintenance.

---

## 1. Executive recommendation

### Choose: **Strategy C+ (new retail ops shell) with selective extraction — not a Bamakor clone**

Closest formal option: **Strategy C**, with a deliberate **B-lite** extraction list, and **D deferred**.

| Strategy | Verdict |
|----------|---------|
| **A — Clone Bamakor** | **Reject.** Source inaccessible here; domain is building/vaad (Project→Resident), not retail (Country→Region→Store→Asset). Clone would import debt: collections, campaigns, attendance stamp, paid addons, Hebrew-only property UX. Fast start → wrong product. |
| **B — Bamakor base + Fixly bits** | **Partial only.** Reuse *patterns* (ticket statuses, worker portal, WhatsApp inbox concept, QR secondary). Do not fork Bamakor as the codebase. |
| **C — New shell, reuse proven services** | **Recommended.** New Next.js + Supabase app under OpticalCenter (or neutral product name), import/adapt: Fixly partner façade patterns, Fixly status guards, Moked Wave-A conversation shape, Bamakor ticket/worker UX lessons. |
| **D — Shared maintenance core now** | **Too early.** Design module boundaries so a shared package is possible later; do **not** extract a monorepo core in MVP. Premature abstraction slows the pilot. |

### Why

1. Optical Center needs **enterprise retail hierarchy + WhatsApp-first intake + ops command center**. Bamakor solves **Israeli building management** with tickets as one module among residents/collections/QR/addons.
2. Fixly is a **marketplace/dispatch network**, excellent as *execution partner*, wrong as HQ CMMS.
3. Moked proves conversational WhatsApp intake ideas but is **demo persistence** (JSON file) — not production Meta infra.
4. Speed still matters: a clean shell with copied patterns is faster *and* safer than stripping Bamakor for 6 weeks.

### Product naming

Build a **neutral retail maintenance platform core**, with Optical Center as first deployment:

- Code/product working name: **`RetailOps` / `MaintainOS` / `StoreMaintain`** (pick one; avoid `OpticalCenterMaintenance` as the platform name).
- Tenant: `Optical Center` = first `organization`.
- Do **not** over-genericize UI copy or schema with fashion/hotel abstractions in MVP — only keep hierarchy + roles + assets generic enough to reuse.

### One-line architecture

```
WhatsApp (primary intake) → Ticket Service (SoT) → HQ Ops Web → Technician PWA
                              ↑
                    optional: Fixly Partner API for external trades
```

---

## 2. Bamakor audit

### What Bamakor actually is (from live app)

Hebrew RTL Next.js PWA for **property / building maintenance ops**:

- Multi-tenant via `clients` / `organizations` / `organization_users` / `client_id`
- Core nav: dashboard, tickets, projects, residents, workers, summary
- Add-ons (paid): calendar, attendance, professionals, WhatsApp inbox, pilot SMS, project documents, campaigns, collections, QR, WhatsApp templates, pending residents
- Public intake: `/report?client=…&project=…` → `POST /api/create-ticket` (`source=web_form`, attachments)
- Worker portal: `/worker` — assigned tickets, status changes, photos, completion notify via WhatsApp, chat, translate, attendance NFC/QR stamp, push
- Meta description explicitly: property management, tickets, worker assignment, **WhatsApp integration**
- API surface includes `/api/whatsapp/webhook` (auth-gated; internals not readable)

### Domain mapping (your proposed rename) — assessment

| Bamakor | Optical Center | Fit? |
|---------|----------------|------|
| Client / Organization | Optical Center corporate | Partial — keep, but add country/region |
| Project | Store | **Weak.** Project ≈ building with residents/vaad, not a retail store with assets/hours/brand standards |
| Resident | Store employee | **Weak.** Resident is tenant/occupant; employee is workforce with shifts/roles |
| Worker | Internal technician | **Good** for internal field staff |
| Professionals (addon) | External provider | **Good** as concept; Bamakor+Fixly already models external network |
| Ticket | Maintenance issue | **Good** lifecycle, wrong surrounding context |

**Do not do a simple rename/refactor.** The abstractions leak (building_number, residents, collections, SITE_TOUR, PROFESSIONAL_ESCORT as first-class ticket statuses).

### Ticket lifecycle (reuse as inspiration)

```
NEW → ASSIGNED → IN_PROGRESS → WAITING_PARTS → SITE_TOUR → PROFESSIONAL_ESCORT → CLOSED
```

In-treatment set: everything except `NEW` and `CLOSED`.

Priorities observed: `URGENT | HIGH | MEDIUM | LOW`.

Ticket fields observed: `ticket_number`, `description`, `status`, `priority`, `reporter_phone`, `reporter_name`, `assigned_worker_id`, `client_id`, `project_id`, `building_number`, `deleted_at`, attachments.

### What to reuse (patterns / ideas)

- Ticket as operational SoT with status machine + worker assignment
- Worker mobile portal (status, photos, completion message to reporter)
- WhatsApp as notification + inbox channel (concept)
- Soft-delete (`deleted_at`)
- Public create-ticket API with media
- Client branding / multi-tenant `client_id`
- UI primitives pattern: `StatusBadge`, `PriorityDot`, dense tables, mobile shell

### What to change

- Project → **Store** with geo hierarchy
- Resident → **StoreUser / Reporter** (phone-mapped staff)
- Add **Asset** model
- Replace building-specific statuses (`SITE_TOUR`) with retail-relevant ones (or keep optional extensibility)
- RBAC scopes: global / country / region / store (Bamakor appears client-scoped, not geo-hierarchical)
- Make WhatsApp **primary intake**, not addon/inbox secondary
- English-first (or FR/EN) enterprise UX for Optical Center; Bamakor is Hebrew-first building ops

### What to delete / not bring

- Collections / vaad billing
- SMS campaigns / pilot SMS residents
- Attendance stamp as core (optional later)
- Paid addon marketplace gating nav
- Resident pending approval flows as core
- Building document folders as MVP

### WhatsApp in Bamakor (partial)

Evidence of production WhatsApp:

- Nav: WhatsApp inbox, WhatsApp templates
- Worker completion → WhatsApp notify reporter
- `/api/whatsapp/webhook` exists
- Fixly docs assume Bamakor remains ticket SoT

**Cannot confirm from available source:** Meta conversation FSM, store/project identification via WA, media download, AI classification, dedupe, tenant resolution, retries. User claim that “most reports are WhatsApp-first” is plausible given product direction, but **unverified without the Bamakor repo**.

---

## 3. Fixly audit

### What Fixly is

Hebrew-first **B2C trades marketplace** (Next.js 16, Supabase, Vercel, Capacitor) with a well-built **Partner Jobs API** aimed at Bamakor.

Documented architecture (`features/`, `services/`, `shared/`, `lib/`) is **aspirational**. Real logic lives in `lib/` + fat API routes + fat screens. `features/` / `services/` are thin.

### Worth taking

| Piece | Path | Why |
|-------|------|-----|
| Partner jobs façade | `lib/integrations/bamakor/*`, `app/api/v1/jobs/**` | Best-engineered subsystem; tests; HMAC webhooks; idempotent external ticket keys |
| Status transition guard | `lib/guards/request-transition.ts` + dual status map | Clean lifecycle discipline |
| Offer / first-accept model | `request_candidates` | Useful for external provider broadcast |
| Realtime status hook | `shared/hooks/use-request-realtime.ts` | HQ + tech live updates |
| Request events + webhook audit | `request_events` | Timeline spine |
| Image upload helper | `lib/storage/upload-request-image.ts` | Adapt for before/after |
| API hygiene | Zod parse, rate limit, Sentry | Standards |
| Pro mobile UX patterns | `ProDashboardScreen` bottom sheet, pull-to-refresh, location share | Technician PWA inspiration |
| Demo backend switch | `resolveDataBackend` / memory store | Great for Optical Center pilot demos |

### Reject / do not port

- Stripe/Tranzila lead credits, Pro subscriptions
- Midrag scraper, SEO city pages, referral growth
- Consumer marketplace browsing/reviews as core
- Thin empty `features/` scaffolding as cargo-cult
- Admin KPI page as-is (marketplace-shaped, too shallow)
- WhatsApp `wa.me` deep links as “integration”

### Partner API mental model (keep)

- **HQ ticket system = SoT for the ticket**
- **Fixly = SoT for external matching/dispatch** (optional network)
- API + signed webhook, no shared DB

For Optical Center: internal technicians should be **first-class assignees inside RetailOps**. Fixly (or equivalent) is an **escape hatch** for external trades — not the default path.

---

## 4. Other repository findings

| Repo | Reality | Reuse |
|------|---------|-------|
| **Moked** | WhatsApp Cloud API + process waves for Israeli freelancers; JSON file DB; demo-complete | **Adapt Wave A conversation pattern**; rewrite Meta transport |
| **OpsBrain_GitHub** | Multi-tenant office SaaS (tasks/chat/docs); Base44 heritage; Bamakor *bug_reports* stub only | **Adapt** workspace membership + Realtime + Storage patterns; reject as ticket product |
| **OpsBrain-Office** | Finance (Morning/GI/Gmail); open RLS (`using true`) | **Reject** for maintenance core |
| **Bamakor_site** | Marketing HTML archive of bamakor.com | **Reject** |
| **bamakor.project** (shtunz) | Unrelated quiz app | **Reject** (name collision only) |

### Moked WhatsApp — short verdict

Reuse as **conversation-design reference**, not as gateway:

- Has: webhook verify token, inbound parse, process engine, demo simulator
- Missing: signature validation, media, templates API, idempotency, queue, per-tenant tokens, durable DB, store directory

---

## 5. WhatsApp architecture (recommended)

### Principle

**WhatsApp-first for store staff. Web app for HQ and technicians.**  
Staff should not learn another app to report a broken AC.

### Target flow (MVP)

```
Employee WA message (+ optional photo)
  → resolve store (hybrid identity)
  → AI/rules extract category, urgency, summary
  → ask 0–2 clarifying questions only if needed
  → create ticket
  → confirm: #OC-18342 · Store · Priority · “team notified”
```

### Store identification — recommendation: **Option D (hybrid), with A as happy path**

For 800+ stores:

| Option | Role |
|--------|------|
| **A — Phone → employee → store** | **Primary.** Provision staff phones (or allow multi-store with default + switch). Lowest friction daily. |
| **B — Store/asset QR → wa.me deep link** | **Onboarding + asset-tagged reports + fallback.** Excellent for AC unit stickers. |
| **C — Bot asks store once** | **Fallback** when phone unknown / multi-store floater / temp staff. Remember mapping after confirmation. |
| **D — Hybrid** | **Ship this.** A → if miss, B context if present → else C. |

**Opinion:** Pure A fails for floaters and shared phones. Pure B fails as daily default (nobody wants to hunt QR for every AC complaint). Pure C creates fatigue. Hybrid matches enterprise reality.

### Conversation / AI policy

AI for: classification, extraction, smart follow-ups, duplicate hint, urgency *suggestion*, summarization.  
Rules engine for: critical escalation (“water near electrical”), SLA class, mandatory fields.  
**No unsupervised dangerous decisions** (auto-close, auto-spend, auto-vendor without policy).

Minimal questions > chatbot theater.

### Technical intake stack (build new; inspired by Moked + Bamakor)

1. Meta Cloud API webhook (verify + **HMAC signature**)
2. Idempotent ingest on `wamid`
3. Queue (at-least-once) for Graph send/media download
4. `conversations` + `messages` tables linked to `ticket_id`
5. Media → object storage → ticket attachments
6. Playbook engine (Wave-A shape): classify → optional Qs → create ticket
7. Template messages for status updates outside 24h window
8. Audit log of bot decisions + human takeover

### QR secondary uses (agree with your plan)

- Back-office sticker → WhatsApp launcher with store context
- Asset tag → store + asset prefilled
- Technician portal access / attendance later
- **Not** the default reporting UX

---

## 6. Domain model

```
Organization
  └── Country
        └── Region
              └── Store
                    ├── Assets
                    ├── StoreUsers (reporters / managers)
                    └── Tickets
                          ├── Messages (WhatsApp transcript excerpt)
                          ├── Attachments
                          ├── Assignments
                          ├── Events (activity timeline)
                          └── Resolution
```

### Suggested entities (logical)

- `organizations`, `countries`, `regions`, `stores`
- `assets` (type, label, store_id, optional QR code)
- `profiles` / `memberships` (RBAC)
- `store_user_phones` (WA id → user → default store)
- `tickets` (number, store, asset?, category, priority, status, sla_due_at, source)
- `ticket_messages`, `ticket_attachments`, `ticket_events`, `ticket_assignments`
- `vendors` / `technicians` (internal vs external)
- Optional later: `fixly_jobs` mirror columns like Fixly’s Bamakor integration

### Status proposal (retail-simplified)

```
new → triaged → assigned → in_progress → waiting_parts → resolved → closed
(+ cancelled)
```

Map Bamakor’s `SITE_TOUR` / `PROFESSIONAL_ESCORT` to optional tags or substates — not MVP core enums unless Optical Center needs them.

### Categories (starter)

HVAC, Electrical, Lighting, Plumbing, Doors/Access, Furniture, Signage, Security, IT, Optical equipment, Other.

---

## 7. RBAC

| Role | Scope |
|------|-------|
| Global Admin | Entire org |
| Global Maintenance | All tickets / all countries |
| Country Maintenance Manager | One country |
| Regional Maintenance Manager | One region |
| Store Manager | One store (and visibility into that store’s tickets) |
| Store Employee | Create/report + see own reports |
| Internal Technician | Assigned tickets (+ maybe region pool) |
| External Provider | Only assigned jobs / limited fields |

**Rules:**

- Enforce with **Supabase RLS** (and service-role only for WhatsApp webhook / partner APIs).
- Never rely on frontend filtering for authorization.
- Bamakor’s `client_id` tenancy is a starting idea; Optical Center needs **scope columns** (`organization_id`, `country_id`, `region_id`, `store_id`) on tickets and memberships.
- OpsBrain membership RLS is closer to multi-tenant SaaS than Fixly’s soft `user_type`.

---

## 8. Database proposal (high-level)

```text
organizations(id, name, ...)
countries(id, organization_id, code, name)
regions(id, country_id, name)
stores(id, region_id, code, name, address, timezone, ...)
assets(id, store_id, type, code, name, meta jsonb)
profiles(id = auth.uid(), ...)
memberships(id, profile_id, role, organization_id, country_id?, region_id?, store_id?)
store_phones(id, store_id, profile_id?, wa_id, is_primary, ...)

tickets(id, number, organization_id, store_id, asset_id?,
        category, subcategory?, priority, status,
        title, description, source, reporter_profile_id?, reporter_wa_id?,
        sla_respond_by, sla_resolve_by, created_at, resolved_at, closed_at)

ticket_assignments(id, ticket_id, assignee_profile_id, vendor_id?, status, ...)
ticket_messages(id, ticket_id, direction, channel, body, media_url?, wa_message_id?, raw jsonb)
ticket_attachments(id, ticket_id, url, kind, uploaded_by)
ticket_events(id, ticket_id, type, actor_id?, payload jsonb, created_at)

vendors(id, organization_id, name, type, ...)
```

Indexes: `(store_id, status)`, `(organization_id, created_at desc)`, `(status, priority)`, unique `wa_message_id`, unique ticket `number`.

---

## 9. UX architecture

### Design target

Linear / Stripe / Vercel density — not SaaS-template KPI circus.  
Typography, hierarchy, fast tables, clear statuses, mobile-first technician.

### Store experience (employees)

- **Primary:** WhatsApp (no app install)
- Secondary: QR → WhatsApp with context
- Optional later: tiny web “my tickets” link from bot — not MVP-critical

### HQ experience (maintenance ops)

Command center web app:

- KPI strip (compact, not giant cards): open, critical, new today, SLA breached, avg response/resolution, resolved this week
- Dense ticket table + filters: country, region, store, category, priority, status, technician, date
- Ticket detail = SoT: store, asset, reporter, **WhatsApp transcript**, photos, priority, status, assignee, SLA, internal notes, activity, resolution
- Assign / reassign / escalate

### Technician experience

- Mobile-first PWA (not native required for MVP)
- Borrow Fixly pro sheet + Bamakor worker portal behaviors: my jobs, acknowledge, in progress, photos, notes, resolve
- Navigate to store (maps link)
- Skip marketplace monetization UX entirely

### Languages

Optical Center is international — plan **i18n from day one** (EN + FR at minimum). Do not ship Hebrew-only Bamakor UX as the enterprise surface.

---

## 10. Figma MCP assessment

**Figma MCP is not connected** in this Cursor environment.

Available MCP servers observed:

| Server | Status |
|--------|--------|
| `cursor-cloud` | ready |
| `Supabase` | needsAuth |
| `Vercel` | needsAuth |
| **Figma** | **absent** |

No Figma resources, files, tokens, or inspect tools available.

### UX tooling recommendation: **Code-first Hybrid (lean)**

| Approach | Verdict |
|----------|---------|
| Figma-first | **No** — MCP unavailable; design-handoff overhead slows pilot |
| Code-first (shadcn/custom) | **Primary** — fastest path to Linear-like ops UI |
| Hybrid | **Light hybrid:** optional Figma only for stakeholder moodboards later; implementation stays code-first |

Build a small design system in code (tokens, StatusBadge, DataTable, filters) inspired by Bamakor’s density and Fixly’s mobile patterns — not a template theme.

---

## 11. Reuse matrix

| Capability | Source | Recommendation |
|------------|--------|----------------|
| Ticket engine concept | Bamakor (live) | **Adapt** — new schema, keep lifecycle lessons |
| WhatsApp intake (production bot) | Bamakor (source missing) | **Re-audit when repo available**; do not assume clone |
| WhatsApp conversation shape | Moked Wave A | **Adapt** playbook; rewrite transport |
| Meta Cloud API client | Moked | **Rewrite** (security/media/templates/idempotency) |
| Partner / external dispatch API | Fixly `lib/integrations/bamakor` | **Reuse/adapt** for external vendors |
| Status transition guards | Fixly | **Reuse pattern** |
| Technician mobile UX | Fixly Pro + Bamakor `/worker` | **Adapt** |
| Realtime ticket updates | Fixly hooks | **Reuse pattern** |
| Chat (in-app) | Fixly polling / OpsBrain Realtime | Prefer **WhatsApp transcript + internal notes**; optional Realtime later |
| Admin / HQ shell | Bamakor nav density | **Adapt**; rebuild tables/KPIs |
| Multi-tenant membership | OpsBrain_GitHub | **Adapt** RLS ideas |
| QR web form | Bamakor `/report` | **Adapt as secondary** launcher / fallback |
| File uploads | Bamakor worker attachments + Fixly storage | **Adapt** |
| Notifications | Bamakor WA notify + Fixly web push | WA templates primary; push optional for techs |
| Activity timeline | Fixly `request_events` | **Reuse pattern** |
| Marketplace monetization | Fixly | **Reject** |
| Collections / campaigns / vaad | Bamakor | **Reject** |
| Finance office | OpsBrain-Office | **Reject** |
| Marketing sites / quiz app | Bamakor_site / bamakor.project | **Reject** |
| Shared monorepo core | — | **Defer** (design for later) |

---

## 12. Risks

### Technical

- **Bamakor source inaccessible** → wrong assumptions about WhatsApp bot until repo shared
- Cloning Bamakor → months of deleting property-management features
- WhatsApp at 800 stores: 24h window, template approvals, phone provisioning, Meta quality rating
- Shared-phone / floater staff break naive phone→store mapping
- AI mis-priority on safety issues without rules
- RLS mistakes on geo scopes (classic multi-tenant footgun)
- Fixly matching (city ILIKE) inadequate for contracted vendors/territories

### UX

- Over-chatty bot → abandonment
- HQ dashboard becoming KPI wallpaper instead of a working queue
- Technician forced into desktop Bamakor-like UI
- Hebrew-first patterns in a French/international retailer

### Scalability / product

- Premature “platform for all retail” abstractions slow Optical Center pilot
- Dual-writing Bamakor + new system creates sync hell — **avoid** unless Bamakor must stay live for this customer (it shouldn’t for Optical Center)
- Treating Fixly as required path for every ticket adds marketplace friction

---

## 13. MVP scope

### In (pilot-proving demo)

1. Org → Country → Region → Store (seed France / Paris / Store 172)
2. WhatsApp intake (demo simulator + real Meta path if credentials exist)
3. Hybrid store identity (seeded phone map + fallback ask + optional QR context)
4. Minimal AI/rules classification + 0–2 questions + photo
5. Ticket create + number confirmation
6. HQ dashboard: queue + filters + assign
7. Ticket detail with transcript + photos + timeline
8. Technician PWA: my jobs → in progress → photo → resolve
9. Basic RBAC: global maint, store employee, technician
10. Assets table **schema + optional link** (not full CMMS)

### Out (explicitly later)

- Full CMMS / preventive maintenance
- Native iOS/Android apps
- Parts procurement / PO
- Complex vendor scorecards
- Bamakor billing/collections/campaigns
- Fixly marketplace monetization
- Shared multi-product monorepo extraction
- Perfect multi-language content ops
- Figma-driven design system

### Demo script (must pass)

Employee WA: “Main AC stopped working” + photo → Store 172 / HVAC / High → ticket created → HQ assigns Jean → Jean progresses → resolves with note/photo → HQ sees full timeline.

---

## 14. What I would change in your current plan

Honest disagreements / sharpening:

1. **Do not start from a Bamakor clone.** Your instinct to reuse Bamakor is right for *lessons* and *WhatsApp-first product sense*, wrong for *codebase lineage*. The live product is a building-management suite; Optical Center is retail ops. Strategy A is the highest regret path after a successful pilot.

2. **Simple Project→Store rename is insufficient** — you already suspected this; I confirm. Resident≠employee; Project≠store; missing Country/Region/Asset/SLA will force a second rewrite if skipped.

3. **WhatsApp-first: I agree strongly** — and I would go further: the HQ web app should not even offer a heavy “employee portal” in MVP. Bot + QR launcher is enough for reporters.

4. **Fixly should not be the assignment brain for internal techs.** Use Fixly-style partner API only for external providers. Internal assignment = direct assign in HQ (Bamakor worker model), not broadcast-first-accept marketplace.

5. **`features/services/shared` from Fixly docs is not proof of good architecture** — the repo itself didn’t fully follow it. Prefer a pragmatic structure: `app/` + `modules/{tickets,whatsapp,stores,ops,tech}/` + `lib/`. Don’t cargo-cult empty folders.

6. **Don’t brand the platform OpticalCenterMaintenance** in code — use a neutral core name with OC as tenant. But **don’t** build plugin frameworks / industry packs yet.

7. **AI intake: yes, but rules-first for safety.** Your critical escalation example is correct; I would make deterministic safety classifiers outrank LLM priority.

8. **Figma is optional here.** Without MCP and under pilot time pressure, code-first yields better enterprise UX faster.

9. **QR as secondary: agree.** I’d still invest early in **asset QR → WhatsApp context** because HVAC/optical equipment ROI is high — but only as deep-link context, not a form product.

10. **Blocker you should unblock next:** share the private Bamakor app repository (and WhatsApp webhook code). Without it, we risk re-implementing a bot you already paid to build — or worse, cloning the wrong parts.

---

## Recommended next decision gate

Please confirm or adjust:

1. **Strategy C+** (new RetailOps shell, selective extraction) — yes/no?
2. Working product name (neutral) — preference?
3. Grant **Bamakor app repo** access for WhatsApp deep audit?
4. MVP geography seed (France / Paris / Store 172) — yes?
5. External Fixly dispatch in MVP or **internal-only assignment first**? (I recommend **internal-only for pilot**.)

**STOP.** No clone, no migrations, no production refactor until you approve direction.
