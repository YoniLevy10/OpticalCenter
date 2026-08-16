# MaintainOS — Development Board & UI Stability Assessment

**Date:** 2026-08-16  
**Scope:** `main` @ production (`https://optical-center-rose.vercel.app`)  
**Mode:** Assessment only — no fixes, no package installs, no refactor in this document.  
**Prepared for:** sharing with product / design / engineering

---

## Contents

1. [Development Board](#1-development-board)
2. [Google Auth status](#2-google-auth--explicit-status)
3. [Main product flow](#3-main-product-flow--what-the-user-sees)
4. [Broken UI list](#4-broken-ui-list)
5. [Root cause analysis](#5-root-cause--why-ai-keeps-breaking-our-ui)
6. [Packages / tools recommendation](#6-packages--tools-recommendation)
7. [What NOT to install](#7-what-not-to-install)
8. [Proposed UI QA architecture](#8-proposed-ui-qa-architecture-minimum-effective)
9. [Implementation plan](#9-implementation-plan-order-only--after-approval)
10. [Effort estimate](#10-estimate--effort-to-stabilize-the-frontend)

**Legend:** ✅ Done · 🟡 Partial · 🔴 Broken · ⚪ Missing

---

## 1. Development Board

| Area | Status | Works? | UX | Backend | Tests | Problems | Next Action |
|------|--------|--------|----|---------|-------|----------|-------------|
| **Entry `/`** | ✅ | Yes → redirect | Immediate to inbox | Redirect only | Indirect e2e | No landing / auth gate | After real auth: `/` → login or role home |
| **Login `/login`** | 🟡 | Magic Link UI yes | Clear Hebrew form + error/sent | `signInWithOtp` → Supabase | No login e2e | **No Google**; no callback route; “pilot direct entry” link | Decide Google vs Magic Link; add `/auth/callback` |
| **Google Auth** | ⚪ | No | None | No `signInWithOAuth` | None | **Does not exist** | Only if product requires it — not demo |
| **Session (Supabase)** | 🟡 | SSR cookies configured | No session UI | `@supabase/ssr` client/server | Indirect via API | No logout; no session-refresh middleware | Logout + middleware refresh |
| **Demo / test auth** | ✅ | Yes under flags | Invisible | `mos_test_actor` + `Bearer test_` | IDOR + auth-model | Easy to confuse with real auth | Keep E2E-only; never in prod |
| **Protected routes (pages)** | 🔴 | No | `/ops/*` open without login | Middleware does **not** gate — only injects demo cookie | E2E assumes open pages | AuthZ is API-only | Gate in layout/middleware → `/login` |
| **Role resolution** | 🟡 | APIs yes | No role-based routing | `memberships` + helpers | Unit auth-model | After login: no HQ vs Tech redirect | Post-login: HQ→`/ops/tickets`, Tech→`/tech` |
| **HQ shell** | ✅ | Yes | AppShell + bottom nav | — | Layout e2e | Tablet = `md` only | Explicit tablet contract (optional) |
| **Issues / Inbox** | 🟡 | Yes (memory) | Strong orthogonal queue | `listTickets` + `applyQueue` | Queue unit + search e2e | Supabase list **missing** SLA columns; default view=`attention` | Select SLA fields in query |
| **Ticket Detail** | 🟡 | Basics yes | Answer + evidence + chronology | `getById` + attachments merge | Golden-path | Timeline transitions broken (`from`/`to` vs `from_status`); actions not sticky on mobile | Fix activity payload; sticky HQ actions |
| **Assignment** | ✅ | Yes | Select + buttons | PATCH + authz | Golden + IDOR | Weak unassign; select fires immediately | Confirm / explicit unassign |
| **Status workflow** | ✅ | Yes | nextStatuses | Transitions machine | Lifecycle/transitions tests | Chronology doesn’t show transitions | After activity fix |
| **WhatsApp → Ticket** | 🟡 | Yes in demo | Simulator + inbox | Intake → createTicket | Intake-matrix + golden | Prod media = `meta-media:` stub; outbound not persisted in memory | Download Meta media |
| **Tech portal** | 🟡 | Yes in demo | Sticky actions | Tech APIs + session SoT | Golden + IDOR | `?techId=` still for SSR; empty `tel:`; photo = URL paste | Session-only tech; store phone |
| **Logout** | ⚪ | No | None | No `signOut` | None | — | Button + clear cookie |
| **PWA install** | 🟡 | Manifests live | start_url inbox/tech | SW v2 | Manifest e2e | `/login` outside scope; `PwaLifecycle` dead | Wire or delete PwaLifecycle |
| **RLS + P0 security** | ✅ | Migration applied | — | Scoped policies + triggers | RLS/hierarchy tests | SSR still service-role | `createUserClient` on pages |

---

## 2. Google Auth — explicit status

**Google Auth does not exist.**

| Mechanism | Reality |
|-----------|---------|
| Google OAuth | **None** — no button, no `signInWithOAuth`, no provider wiring in code |
| Magic Link | **Yes** — `/login` → `supabase.auth.signInWithOtp` → redirect to `/ops/tickets` |
| Login callback | **Missing** — no `/auth/callback` / `exchangeCodeForSession` |
| Session persistence | Partial — Supabase SSR cookies exist, no refresh middleware |
| Logout | **Missing** |
| Protected pages | **Missing** — HQ pages render without a session |
| Role redirect | **Missing** |
| Demo bypass | **Yes** — middleware + test bearer when `FORCE_MEMORY` / `ALLOW_TEST_AUTH` |

**Conclusion:** Current entry is **Magic Link + an open pilot door for demo**, not real Google Auth.

### Evidence paths

| Path | Role |
|------|------|
| `src/app/page.tsx` | `/` → `/ops/tickets` |
| `src/app/login/page.tsx` | Magic link only |
| `src/middleware.ts` | Demo cookie injector, not a gate |
| `src/lib/auth/request-actor.ts` | Session vs test actor |
| `src/lib/auth/types.ts` | Roles, test auth, AuthZ helpers |
| `src/app/api/auth/demo-session/route.ts` | Sets `mos_test_actor` |
| `src/app/api/tickets/*`, `src/app/api/tech/tickets/*` | Real AuthZ boundary |

---

## 3. Main product flow — what the user sees

```
/  →  /ops/tickets (inbox)     ← without login
        ↓
   Issues queue (Operational Quiet)
        ↓
   Ticket Detail
        ↓ PATCH (requires session/cookie)
   Assign / Status
        ↓
   /tech → job → resolve
```

**Parallel:**

```
Simulator / WhatsApp webhook
  → intake → ticket
  → appears in HQ inbox
  → Ticket Detail (chronology + evidence)
```

| Step | Feels like demo? |
|------|------------------|
| Enter without login | Yes — demo-open |
| Magic Link | Partial product |
| Inbox / Detail design | Product (OQ V1) |
| Mutations without real session | Demo cookie / 401 |
| Tech `?techId=` | Demo |
| WhatsApp in demo | Works; prod media partial |

**WhatsApp after redesign:** Still wired (golden-path green). Design did not break intake.

---

## 4. Broken UI list

### P0 — visibly broken / functionally wrong

1. **Tech “החנות” → empty `tel:`** — looks like a real button, cannot call  
2. **Timeline does not show status transitions** — writers emit `{from,to}`, reader expects `from_status`/`to_status`  
3. **`PwaLifecycle` is dead + uses obsolete tokens** — if remounted, UI breaks immediately  

### P1 — bad UX

1. HQ ticket actions **not sticky** on mobile (below chronology)  
2. Tablet at 768 gets sidebar + dense table without horizontal scroll affordance  
3. Filter chips / segmented controls — tap targets under 44px  
4. Toast always offsets for bottom-nav even on desktop  
5. Orphan pre-OQ components (`IssuesMobileList`, `IssuesFilterBar`, `StoresMobileList`) — trap for the next AI pass  
6. Queue SLA on Supabase — fields not selected in `listTickets`  

### P2 — polish

1. `DESIGN_SYSTEM.md` names components that don’t exist (`Drawer`, `PriorityEdge`, …)  
2. Three different RTL chevron strategies  
3. `rounded-t-[16px]` outside token radius scale  
4. Unused Radix packages in `package.json` (tabs / dropdown / tooltip)  

---

## 5. Root cause — why AI keeps breaking our UI

**Direct answer: H — a combination, with a clear center of gravity.**

| | Factor | In MaintainOS? |
|---|--------|----------------|
| A | Weak design system | **Partial** — tokens are strong on paper, **no enforcement** |
| B | No Storybook | **Yes — critical** |
| C | No real visual regression | **Yes** — 4 screenshots with `maxDiffPixelRatio: 0.18` (too soft) |
| D | Too much raw Tailwind | **Moderate** — better than before; chips/nav still raw |
| E | Component architecture | **Yes** — orphans + duplicates after redesign |
| F | Prompts | **Contributes** — not the only cause |
| G | Breakpoints | **Yes** — almost only `md`; tablet is accidental |
| H | Combination | **This is the diagnosis** |

### Ranked primary causes

1. **D+E — orphan UI + doc≠code** — after each redesign, old files remain; the next agent “fixes” the wrong file.  
2. **A — no lint/gate on the design system** — `text-[13px]`, raw `<button>`, dead tokens still allowed.  
3. **C — soft visual regression** — 18% pixel tolerance won’t catch mobile breakage.  
4. **B — no Storybook** — nowhere that Button/Row/Sheet stabilize once.  
5. **H — stacked redesigns** (Quiet → Mobile QA → OQ V1) without consolidation.

**This is not “AI is bad.”**  
It is **missing Minimum Effective UI Infrastructure** against a high change rate.

---

## 6. Packages / tools recommendation

### Component foundation

| Option | Recommendation |
|--------|----------------|
| **Stay on Radix + our OQ primitives** | ✅ **Yes** — Dialog/Slot already used; OQ is already the design system |
| Full shadcn/ui migration | ❌ Not now — large migration, low pilot ROI |
| Base UI / Ark / React Aria swap | ❌ No — foundation swap mid-stabilization = new regressions |
| Expand Radix carefully later | Optional later (only if actually used) |

### Storybook

**Yes — minimal.** Only critical primitives:

- Button  
- Input / Search  
- OperationalRow  
- Table  
- BottomSheet  
- Toast  
- Signal / SLA / Status / Priority  
- Navigation chrome (AppShell pieces)

This is the highest leverage against “every page breaks again.”

### Visual regression

| Tool | Recommendation |
|------|----------------|
| **Stricter Playwright `toHaveScreenshot`** | ✅ Phase 1 — already present; tighten tolerance + viewports + routes |
| Chromatic | Only if Storybook is adopted seriously (phase 2) |
| Percy | Overkill for this pilot size |
| Argos | Cheaper cloud review UI later if needed |

### Responsive screenshots

Playwright matrix on at least:

**390 / 430 / 768 / 1024 / 1440** ×  

- `/ops/tickets`  
- `/ops/tickets/[id]`  
- `/tech`  
- `/tech/[id]`  
- `/login`

### Accessibility

Keep `@axe-core/playwright`; expand to ticket detail + tech.  
**Do not** start a React Aria migration now.

### Design tokens

**CSS variables + Tailwind are enough.**  
Style Dictionary — **not now.**

---

## 7. What NOT to install

- ❌ Full shadcn migration  
- ❌ Base UI / Ark / React Aria rewrite  
- ❌ Percy / Applitools at this stage  
- ❌ Style Dictionary / Token Studio pipeline  
- ❌ Design-system monorepo / Turborepo UI package  
- ❌ Another trendy component library alongside OQ  
- ❌ More unused Radix packages “just in case”

---

## 8. Proposed UI QA architecture (Minimum Effective)

```
Design tokens (globals.css) + short DESIGN_SYSTEM.md (synced to code)
        ↓
Primitives only (Button, Input, Row, Table, Sheet, Toast, Signal)
        ↓
Storybook (minimal) — isolated states: empty / loading / error / critical / RTL
        ↓
Screens compose primitives (no one-off page chrome)
        ↓
Playwright visual pack
  - 5 viewports × 5 critical routes
  - maxDiffPixelRatio ≤ 0.02–0.05 + mask clocks / live SLA
        ↓
E2E functional (golden path + auth IDOR)  ← already strong
        ↓
CI fail → no merge
```

### Hard rule for agents

No screen change without:

1. An existing primitive **or** a new Storybook story  
2. Green screenshot pack  
3. Deletion of any orphan component that was replaced  

Target workflow:

```
Design System → Components → Storybook → Screens → Responsive screenshots → Visual regression → E2E → Merge
```

Not:

```
Prompt → AI changes 20 files → Push → Yoni opens iPhone → everything is broken
```

---

## 9. Implementation plan (order only — after approval)

| Phase | Work | Est. days |
|-------|------|-----------|
| **0. Freeze features** | No new redesign; stability only | — |
| **1. Cleanup** | Delete orphans; sync DESIGN_SYSTEM↔exports; fix functional P0 (timeline keys, `tel:`) | 1–2 |
| **2. Visual gate** | Harden Playwright screenshots + 5 viewports + critical routes + CI | 1–2 |
| **3. Storybook mini** | 8–12 stories for primitives | 2–3 |
| **4. Auth productize** | Callback + page gate + logout (+ Google only if approved) | 2–4 |
| **5. SSR session** | `createUserClient` on HQ/Tech pages | 2–3 |
| **6. Optional** | Chromatic only if Storybook sticks | 1 |

**Do not start phase 4 before 1–3** — otherwise Google Auth lands on an still-unstable UI.

---

## 10. Estimate — effort to stabilize the frontend

| Goal | Effort |
|------|--------|
| **Minimum Effective (phases 1–3)** — stop UI breaking on every push | **~1 week** (4–7 working days) |
| **+ Real auth without Google** (callback, gate, logout) | **+3–5 days** |
| **+ Google OAuth** | **+2–3 days** (Supabase console + UI + tests) |
| **+ SSR on user client / full RLS in pages** | **+3–5 days** |
| **Full “enterprise UI platform”** | **Not recommended** for pilot |

**To break the broken-UI loop:** one focused week on cleanup + visual gate + minimal Storybook is the highest ROI before new features.

---

## Appendix A — Current stack inventory (facts)

| Kind | Present |
|------|---------|
| Framework | Next 15, React 19 |
| Radix in package.json | dialog, dropdown-menu, slot, tabs, tooltip |
| Radix actually imported | dialog, slot |
| Styling | Tailwind 4, CVA, clsx, tailwind-merge |
| Tokens | `src/app/globals.css` (substrate / signal / tenant) |
| Storybook | **No** |
| Chromatic / Percy | **No** |
| Playwright screenshots | Soft — 4 baselines, `maxDiffPixelRatio: 0.18` |
| Axe | Yes — ops tickets, color-contrast disabled |
| Design docs | `docs/DESIGN_SYSTEM.md`, `docs/MAINTAINOS_DESIGN_AUDIT.md` |

---

## Appendix B — Recommended next decision

When ready to execute (not in this assessment):

1. Approve **Phase 1 (cleanup + functional P0)**  
   **or**  
2. Approve **Phase 2 (visual gate)** first if phone breakage is the main pain  

Then continue 1 → 2 → 3 before auth productization.

---

*End of assessment. No implementation started.*
