# MaintainOS Design Audit

**Product:** MaintainOS (Optical Center Israel pilot)  
**Repo:** `YoniLevy10/OpticalCenter`  
**Status:** Audit only — **no redesign implemented**  
**Date:** 2026-08-15  
**Scope:** Current UX/UI mapping, design-system inventory, Bamakor infrastructure comparison, recommendations for a coherent product system  

---

## 1. Executive Summary

MaintainOS already has a clear **direction**: white-first, quiet, dense, operational UI (“Operational Quiet”) with Hebrew RTL, dual shells (HQ + technician), and early PWA support. The recent design-system pass (`globals.css` tokens + `OpsShell` / primitives) is the right foundation.

What is **not** yet true: the product does not yet behave as **one coherent system**. It is a collection of screens that mostly share tokens on HQ pages, while login, simulator, and especially technician detail still use a second visual language (`zinc` / `sky` / `emerald` Tailwind defaults). Several primitives exist but are unused (`Modal`, `Drawer`, `Tabs`, `PageHeader`). Mobile HQ still shows desktop tables. PWA is installable but not yet “native-ish” (no safe-area discipline, no bottom sheets, weak offline).

### Verdict in one paragraph

Keep the quiet white system, keep table density and StatusDot/PriorityDot language, keep technician mobile-first shell. **Unify** all screens onto tokens, add a real responsive strategy (table ↔ operational list), upgrade mobile/PWA shell patterns from Bamakor (safe areas, bottom sheets, bottom-nav height token), and separate **MaintainOS product chrome** from **Optical Center tenant branding**. Do not chase a decorative Apple marketing look — chase Apple *craft*: consistency, density, touch targets, focus, motion restraint.

### Highest-impact findings

| # | Finding | Severity |
|---|---------|----------|
| 1 | Dual visual systems: tokenized HQ vs zinc/sky tech/login/simulator | High |
| 2 | Issues has no mobile list — desktop table on phones | High |
| 3 | Desktop nav is top-only; no sidebar; Settings missing from mobile bottom nav | Medium–High |
| 4 | PWA lacks Bamakor-level shell: safe areas, sheet modals, nav height, shortcuts | Medium–High |
| 5 | Product vs tenant branding conflated (`OC` mark = product icon) | Medium |
| 6 | Modal/Drawer/Tabs/PageHeader unused; forms reinvented per page | Medium |
| 7 | Empty/loading/error/toast coverage is uneven | Medium |
| 8 | Quiet status language is good — protect it | Keep |

### Recommended next step (after review)

Agree on: (1) token lock, (2) nav architecture Option C hybrid, (3) branding layers, (4) P0 screen list — then implement as a system, not screen-by-screen polish.

---

## 2. Current Design System

**Name in code:** “MaintainOS Operational Quiet”  
**Source of truth:** `src/app/globals.css` (+ Tailwind v4 `@theme inline` bridge)  
**Font:** Heebo via `next/font` (`--font-heebo`)  
**Direction:** `html lang="he" dir="rtl"`  
**Numeric features:** `font-feature-settings: "tnum" 1` on `body`

### Token inventory (CSS variables)

| Token | HEX / value | Role |
|-------|-------------|------|
| `--canvas` | `#f7f7f5` | Page background |
| `--surface` | `#ffffff` | Cards, header, tables |
| `--border` | `#e8e8e4` | Default borders |
| `--border-strong` | `#d4d4ce` | Stronger edges / neutral dots |
| `--text` | `#1a1a1a` | Primary text |
| `--text-muted` | `#6b6b66` | Secondary |
| `--text-faint` | `#9a9a94` | Tertiary / metadata |
| `--accent` | `#8b1e2d` | Brand/action (OC burgundy) |
| `--accent-hover` | `#731828` | Primary hover |
| `--accent-soft` | `#f6eef0` | Soft accent fills |
| `--danger` / `--danger-soft` | `#a33b3b` / `#f8eeee` | Critical / errors |
| `--warning` / `--warning-soft` | `#b07a1a` / `#f8f1e4` | Waiting / caution |
| `--success` / `--success-soft` | `#2f6b4f` / `#eaf4ee` | Resolved / success |
| `--info` / `--info-soft` | `#4a5d73` / `#eef1f5` | In progress / info |
| `--radius-sm/md/lg` | `6 / 8 / 12px` | Radii |
| `--row-h` | `42px` | Table row height |
| `--shadow-modal` | `0 8px 30px rgba(26,26,26,0.08)` | Only shadow token |

### System maturity

| Layer | Status |
|-------|--------|
| Color tokens | Defined and wired to Tailwind colors |
| Radius tokens | Defined; mostly used via `var(--radius-*)` |
| Shadow tokens | Modal only; tabs use ad-hoc `shadow-sm` |
| Spacing scale | **Not formalized** — ad-hoc Tailwind (`px-4`, `py-5`, `gap-3`…) |
| Typography scale | **Not formalized** — many raw `text-[11px]`…`text-[28px]` |
| Motion tokens | None |
| Component library | Partial (`button`, `input`, `primitives`, `overlay`, `toast`, `tabs`) |
| Adoption | HQ pages good; login/simulator/tech detail **drift** |

---

## 3. Color System

### Canvas `#f7f7f5`

- **Used:** body background, KPI/table header washes, hover rows, inactive nav hover.
- **Consistent?** Yes on OpsShell pages.
- **Opinion:** Keep. Warm-neutral canvas is better than pure `#fff` full-bleed for long sessions. Close to Bamakor `#f9f9fb` but warmer — fine for Optical Center retail warmth without cream cliché.

### Surface `#ffffff`

- **Used:** header, cards, tables, bottom nav, inputs, modals.
- **Consistent?** Yes where tokens apply; tech detail uses `bg-white` + `border-zinc-200` instead.
- **Opinion:** Keep as primary surface.

### Borders `#e8e8e4` / `#d4d4ce`

- **Used:** nearly every container; `*` sets default `border-color`.
- **Consistent?** Strong on HQ; tech/login use `zinc-200/300`.
- **Opinion:** Keep. Borders are the main structure language (good). Avoid adding shadows to compete.

### Text `#1a1a1a` / muted `#6b6b66` / faint `#9a9a94`

- **Used:** hierarchy across HQ.
- **Consistent?** Good on Ops; login uses `text-zinc-*`; tech detail mixes zinc.
- **Opinion:** Keep three-step hierarchy. Enforce via tokens only.

### Accent `#8b1e2d` (+ hover/soft)

- **Used:** logo tile, primary buttons, active nav, links (stores WA), selection soft fill, tech themeColor.
- **Consistent?** On HQ yes; tech actions use **sky-700 / emerald-700** instead of accent/success tokens.
- **Opinion:** Acceptable for Optical Center deployment as **tenant accent**, but should not be hard-coded as the only MaintainOS product identity forever. See §14–16.

### Danger / warning / success / info

| Token | HEX | Usage today | Consistency | Change? |
|-------|-----|-------------|-------------|---------|
| danger | `#a33b3b` | KPI attention, SLA breach, PriorityDot high/critical, toast border | Partial — tech uses `red-*` | Unify to tokens |
| warning | `#b07a1a` | waiting_parts, medium priority, techId missing banner | Partial — amber in tech actions | Unify |
| success | `#2f6b4f` | resolved status | Partial — emerald in tech | Unify |
| info | `#4a5d73` | in_progress | Rare outside StatusDot | Keep quiet |

### Soft fills

Used correctly for badges/chips. Tech SLA chips reinvent soft red/zinc pills — duplicate language.

### Color consistency score: **6.5 / 10**

Tokens are good; adoption is incomplete. The biggest visual break is technician job detail + actions.

### Recommendation

1. Ban raw `zinc-*`, `sky-*`, `emerald-*`, `amber-*`, `red-*` in product UI (allow only in rare third-party embeds).
2. Keep semantic status colors **quiet** (dot + label), not big colored pills.
3. Primary actions: accent OR neutral black for destructive-rare cases — not sky blue.

---

## 4. Typography

### Font family

- **Primary:** Heebo (Hebrew + Latin) — correct for RTL Hebrew pilot.
- **Fallback:** `ui-sans-serif, system-ui, sans-serif`.
- **Bamakor:** Heebo + Inter + SF Pro Display stack; MaintainOS is simpler (good for pilot).
- **Recommendation:** Keep Heebo for HE. Later add a Latin companion (Inter or system) only if EN/FR HQ expands.

### Observed sizes (raw)

| Role | Observed sizes | Notes |
|------|----------------|-------|
| Landing H1 | `28px` | Only large display |
| Page title (OpsShell) | `21px` semibold | Also duplicated in `PageHeader` |
| Tech title | `18px` | Different from HQ |
| Modal title | `15px` medium | |
| Section titles | `14px` medium | Cards / lists |
| Body | `13–14px` | Mixed |
| Controls / buttons | `13px` | Button primitive |
| Metadata / table headers | `11–12px` | |
| Bottom nav | `11px` (ops) / `13px` (tech) | Inconsistent |
| Badges | `11px` | Badge primitive |
| StatusDot label | `12px` | |

### Weights

Mostly `font-medium` (500) and `font-semibold` (600). Occasional `font-semibold` on tech CTAs. No formal weight scale.

### Line heights

Mostly Tailwind defaults; landing body uses `leading-relaxed`. Ticket description uses `leading-relaxed` — good. Tables rely on row height more than line-height.

### Inconsistencies

1. HQ page title `21px` vs tech `18px` vs login `text-xl` vs landing `28px` — four title systems.
2. `text-sm` / `text-xs` (login, tech, simulator) vs `text-[13px]` / `text-[11px]` (HQ) — same intent, different tools.
3. Bottom nav label size differs Ops vs Tech.
4. `PageHeader` exists but OpsShell inlines the same pattern → drift risk.

### Recommended type hierarchy (one scale)

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 24–28px | 600 | Marketing/landing only |
| `title` | 20px | 600 | Page H1 |
| `title-sm` | 17px | 600 | Nested / mobile tech H1 |
| `section` | 14px | 500 | Card headers |
| `body` | 13px | 400 | Default |
| `body-emphasis` | 13px | 500 | Row primary |
| `meta` | 12px | 400 | Secondary line |
| `caption` | 11px | 500 | Table headers, badges, nav labels |
| `button` | 13px | 500 | All buttons |

Lock line-heights: body 1.45, titles 1.25, meta 1.35.

---

## 5. Spacing

### Observed patterns

| Context | Typical values |
|---------|----------------|
| Page padding (Ops) | `px-4 py-5`, mobile `pb-20` for bottom nav |
| Page padding (Tech) | `px-4 pt-4 pb-24` |
| Section gaps | `gap-3` / `gap-4` / `space-y-4` / `space-y-5` |
| Header height | Ops `h-12`; Tech `py-3` (variable) |
| Card padding | `p-4` or `px-3 py-3` (KPIs tighter) |
| Table cell | `px-3`, row `42px` |
| Form gaps | `space-y-2` / `space-y-3` / `space-y-4` |
| Modal padding | `p-5`, title gap `mb-4` |
| Filter chips | `h-8`, `gap-2` |
| Empty state | `py-14 px-6` |

### Is there a spacing scale?

**No formal scale.** Tailwind defaults act as an informal 4px grid, but values are chosen per screen. Mostly coherent on HQ; tech/login freestyle.

### Recommendation

Adopt a documented scale (4-base): `4, 8, 12, 16, 20, 24, 32, 48`.  
Map:

- page x-padding → 16  
- page y → 20  
- section gap → 16–20  
- card padding → 16 (KPI 12)  
- form field gap → 12  
- modal → 20  
- keep `--row-h: 42px`

---

## 6. Radius / Borders / Shadows

### Radii

| Token | Value | Typical use |
|-------|-------|-------------|
| sm | 6px | Tabs, small controls |
| md | 8px | Buttons, inputs, nav pills |
| lg | 12px | Cards, tables, empty, modal |
| full | pill | Badges, FilterChips |
| Ad-hoc | `rounded-xl` (12 Tailwind), `rounded-lg`, `rounded-md` | Tech/login/simulator |

**Cohesion:** HQ mostly tokenized. Tech CTAs use large `rounded-xl` full-width buttons — intentional mobile affordance, but should map to a named `radius-action` or `radius-lg`.

### Borders

- Weight: almost always `1px`.
- Color: `--border`; dashed for empty.
- Separators: `divide-y divide-border`, table `border-b`.
- **Opinion:** Border-first structure is cohesive and enterprise-appropriate. Do not add multi-layer shadows.

### Shadows

- `--shadow-modal` only.
- Tabs active: `shadow-sm`.
- No elevation system for cards (good — cards are bordered flat).

### Cohesion score: **7 / 10** on HQ, **4 / 10** across whole product.

---

## 7. Components Inventory

### Component table

| Component | Path | Variants | Usage | Issues | Recommendation |
|-----------|------|----------|-------|--------|----------------|
| **Button** | `src/components/ui/button.tsx` | default / primary / danger / ghost; sm / md | TicketActions, SeedDemo | Search submit & tech CTAs bypass it | **Keep** — enforce everywhere |
| **Input** | `src/components/ui/input.tsx` | Input | Tickets search, assign UUID | Login/simulator/tech reinvent | **Keep** |
| **Select** | same file | native `<select>` | Ticket assign | No custom dropdown | **Keep** for MVP; redesign later if needed |
| **Textarea** | same file | — | Exported; tech uses raw | Underused | **Keep** — use in tech/simulator |
| **Search** | inline form on tickets | — | GET `q` | No shared SearchField; submit is raw button | **Merge** into `SearchField` |
| **FilterChip** | `primitives.tsx` | active/inactive link chips | Tickets segments | Link-based only (full navigation) | **Keep**; add button variant later |
| **Badge** | `primitives.tsx` | tone: neutral/accent/danger/warning/success/info | Low direct use | Status uses StatusDot instead | **Keep** for counts/tags |
| **StatusDot** | `primitives.tsx` | tones | Status/Priority/SLA | Good quiet language | **Keep** — core |
| **StatusBadge** | `badges.tsx` | maps ticket status → StatusDot | Ops + tech list | — | **Keep** |
| **PriorityDot** | `badges.tsx` | critical/high→danger, medium→warning | Ops + tech | Name says Dot, is StatusDot | **Keep** (maybe rename PriorityStatus) |
| **SlaChip** | `badges.tsx` | breached flag | Ops table/detail | Tech detail reinvents pill | **Keep** — use on tech too |
| **SurfaceTable** | `primitives.tsx` | — | Tickets, Stores | No mobile alternative | **Keep** + add **MobileList** |
| **Mobile list row** | ad-hoc in Ops overview + TechJobList | — | Attention list, tech jobs | Not shared | **Merge** into `OpsListRow` |
| **Card** | `primitives.tsx` | bordered surface | Dashboard, detail, settings | Overused as default container (acceptable for ops) | **Keep** sparingly |
| **Modal** | `overlay.tsx` | Radix Dialog centered | **Unused in pages** | Dead code path | **Keep** — wire for confirm/create |
| **Drawer** | `overlay.tsx` | side panel | **Unused** | No bottom sheet | **Keep** desktop; add **BottomSheet** for mobile |
| **Bottom Sheet** | — | — | Missing | Bamakor has `app-modal-sheet-*` | **Add** (pattern recycle) |
| **Tabs** | `tabs.tsx` | Radix | **Unused** | TechJobList custom tabs | **Merge** tech tabs → Tabs |
| **Toast** | `toast.tsx` | neutral/success/danger | Seed + ticket update | Fixed `bottom-4` — collides with bottom nav; no aria live region strong UX | **Redesign** position + a11y |
| **Tooltip** | — | — | Missing | — | **Add** later (P2) |
| **Dropdown** | — | native select only | — | — | **Defer** |
| **EmptyState** | `primitives.tsx` | title/desc/action | Tickets, reports, tech tabs | Good | **Keep** |
| **Skeleton** | `primitives.tsx` | className | **Unused** | No loading skeletons in routes | **Keep** — adopt |
| **PageHeader** | `primitives.tsx` | title/subtitle/actions | **Unused** | Duplicated inside OpsShell | **Merge** into shell or use exclusively |
| **OpsShell / Nav** | `layout/ops-shell.tsx` | top + bottom | All `/ops/*` | Settings not in mobile nav; no icons; no “More” | **Redesign** nav IA |
| **TechShell** | `layout/tech-shell.tsx` | back + bottom | `/tech/*` | HQ link odd for field tech; no safe-area | **Refine** |
| **Sidebar** | — | — | Missing | — | **Add** if Option B/C chosen |
| **SeedDemoTicketButton** | `ops/seed-demo-ticket-button.tsx` | — | Dashboard/tickets | Demo chrome in product UI | **Keep** behind demo flag later |

### Duplicates to eliminate

1. OpsShell header block ≈ PageHeader  
2. Tech custom tabs ≈ Tabs  
3. Tech SLA pill ≈ SlaChip  
4. Raw buttons ≈ Button  
5. Zinc cards ≈ Card  
6. Inline empty `<li>` messages ≈ EmptyState  

---

## 8. Navigation

### Current architecture

**Desktop (Ops):** sticky top bar — logo+product name + horizontal links (סקירה / תקלות / חנויות / דוחות / הגדרות) + tenant crumb “Optical Center · ישראל”.  
**Mobile (Ops):** fixed bottom nav with **first 4** primary items only — **Settings omitted**. Text-only, no icons.  
**Tech:** sticky header (back or OC mark) + bottom nav: העבודות | HQ.  
**Landing `/`:** link grid, no chrome.  
**Login:** no chrome.

### Active states

- Ops top: soft accent pill (`bg-accent-soft text-accent`).
- Ops bottom: accent text only.
- Tech bottom: jobs always accent (not route-aware beyond that).

### Hierarchy / context

- Ticket detail stays under `/ops/tickets` active — good.
- Simulator marks pathname `/ops/settings` — good enough.
- No breadcrumbs beyond a “back to tickets” text link.
- No store detail route → no store context nav.

### Problems

1. Top nav does not scale if modules grow (assets, vendors, WhatsApp inbox…).
2. Mobile loses Settings → buried.
3. Tech → HQ deep-link breaks field mental model.
4. No “More” sheet for overflow.
5. Product name + OC tile + tenant string compete in 48px header.

### Recommendation for MaintainOS: **Option C — Hybrid**

| Option | Summary | Fit |
|--------|---------|-----|
| **A — Top navigation only** | Current desktop | OK for 5 links; weak for growth & long sessions |
| **B — Sidebar + top bar** | Classic enterprise | Strong for HQ density; heavier on RTL polish |
| **C — Hybrid** | **Desktop: collapsible sidebar + thin top context bar; Mobile: bottom nav (primary) + More sheet** | **Best for MaintainOS** |

**Why C:** HQ users live in Issues all day — sidebar keeps destinations stable without re-scanning a top strip; top bar holds tenant, search, user. Mobile field/ops need thumb zone — Bamakor already proved bottom nav + sheets. Technician stays a **separate mobile shell** (not sidebar).

---

## 9. Page-by-page Audit

### 9.1 Landing / Root

**Page:** Home  
**Route:** `/`  
**Purpose:** Choose HQ vs tech entry; explain product briefly.  
**Current structure:** Brand row (OC + MaintainOS), H1 Optical Center Israel, short pitch, 4 link cards.  
**What works:** Clear portal chooser; quiet; honest about channels (WA / HQ / PWA).  
**Problems:** Looks like a temporary hub, not a product home; cards as navigation; brand hierarchy mixes product vs customer in the H1.  
**Desktop UX:** Fine for pilot gate.  
**Mobile UX:** Fine.  
**Visual:** 7/10 · **UX:** 6.5/10  
**Recommendation:** Keep as signed-out/chooser; later redirect authenticated users to `/ops` or `/tech`. Clarify H1 = product, subtitle = tenant.

### 9.2 Login

**Page:** Login  
**Route:** `/login`  
**Purpose:** Magic-link auth via Supabase.  
**Current structure:** Centered form, email, submit, status, bypass note to `/ops`.  
**What works:** Simple; pilot-friendly bypass documented.  
**Problems:** Entirely off design system (`zinc`, `bg-zinc-900`); no OC/MaintainOS chrome; no error component; no loading skeleton.  
**Desktop / Mobile:** Adequate functionally.  
**Visual:** 4/10 · **UX:** 6/10  
**Recommendation:** Restyle to tokens + Button/Input; add product mark; keep bypass only in demo.

### 9.3 Ops Overview

**Page:** סקירה  
**Route:** `/ops`  
**Purpose:** Situational awareness — open volume, critical, attention queue, store-ID explainer.  
**Current structure:** 4 KPI cards; “דורש תשומת לב” list (6); side card for store identification + links.  
**What works:** Quiet KPIs; attention list scans well; priority+status language; demo seed action.  
**Problems:** Attention list is not filtered to true attention (uses `tickets.slice(0,6)`); KPI cards add card chrome that may be unnecessary; side explainer is onboarding content on an ops home.  
**Desktop:** Good for glance.  
**Mobile:** KPI 2×2 OK; list OK; bottom nav OK.  
**Visual:** 7.5/10 · **UX:** 7/10  
**Recommendation:** Make attention = critical/high + SLA breach + new; move onboarding to Settings; keep density.

### 9.4 Issues (Tickets)

**Page:** תקלות  
**Route:** `/ops/tickets`  
**Purpose:** Operational inbox — filter, search, open ticket.  
**Current structure:** Segment FilterChips; search form; SurfaceTable (priority, number, store, issue, status, age, SLA).  
**What works:** Dense table; quiet status; segments match mental model; empty state solid.  
**Problems:** **No mobile list**; horizontal scroll pain; search requires submit click; priority filter in URL but no UI control; “critical” segment mixes priority into status chips.  
**Desktop:** Strong long-session candidate.  
**Mobile:** Weak — needs dedicated presentation.  
**Visual:** 7.5/10 · **UX desktop:** 8/10 · **UX mobile:** 4.5/10  
**Recommendation:** P0 — responsive split: table ≥md, OpsListRow &lt;md.

### 9.5 Issue Detail

**Page:** Ticket detail  
**Route:** `/ops/tickets/[id]`  
**Purpose:** Understand ticket, read transcript/events, assign, transition status.  
**Current structure:** Back link; main column (status row, description, messages, events); sidebar (details DL + TicketActions).  
**What works:** Lifecycle + events; WhatsApp messages pane; assign + transitions via shared Button/Select; toast on success.  
**Problems:** Actions buried in sidebar on desktop (OK) but **below fold awkward on mobile**; no sticky action bar; no timeline visualization beyond list; back chevron is “←” in RTL (directionally odd).  
**Desktop:** Good multi-column.  
**Mobile:** Stacked cards usable but action friction.  
**Visual:** 7/10 · **UX:** 7/10  
**Recommendation:** Mobile sticky actions / bottom sheet for assign; keep multi-column desktop.

### 9.6 Stores

**Page:** חנויות  
**Route:** `/ops/stores`  
**Purpose:** See store codes and WhatsApp deep links (QR/NFC same link).  
**Current structure:** Table only — code, name, city, prefill text, WA link.  
**What works:** Dense; codes tabular; clear WA affordance.  
**Problems:** **No Store Detail**; no search/filter; mobile table again; mono prefill column noisy for managers.  
**Desktop:** OK for small fleet.  
**Mobile:** Needs list + detail sheet.  
**Visual:** 6.5/10 · **UX:** 6/10  
**Recommendation:** P1 — mobile list; optional store detail (open tickets, contacts).

### 9.7 Store Detail

**Does not exist.**  
**Recommendation:** Add when store ops need context (open tickets, assets, phone mappings). Until then, link store name from tickets to filtered Issues.

### 9.8 Reports

**Page:** דוחות  
**Route:** `/ops/reports`  
**Purpose:** Placeholder for SLA/summaries.  
**Current structure:** EmptyState + card with links.  
**What works:** Honest empty; doesn’t fake charts.  
**Problems:** Nav item for empty module creates trust leak if users click often.  
**Visual:** 6/10 · **UX:** 5/10  
**Recommendation:** Keep route; consider hiding from primary nav until data, or show 2–3 real summary metrics from existing tickets.

### 9.9 Settings

**Page:** הגדרות  
**Route:** `/ops/settings`  
**Purpose:** Pilot tools hub (simulator, login, tech, health).  
**Current structure:** 2×2 link cards.  
**What works:** Clear tool directory.  
**Problems:** Not real settings (no org/branding/users); missing from mobile bottom nav; cards feel marketing.  
**Visual:** 6.5/10 · **UX:** 6/10  
**Recommendation:** Split “Settings” vs “Lab/Demo tools”; put Lab under More on mobile.

### 9.10 Simulator

**Page:** סימולטור WhatsApp  
**Route:** `/ops/simulator`  
**Purpose:** Dev/demo WhatsApp intake without Meta.  
**Current structure:** Two-column form + bot reply log; zinc styling.  
**What works:** Useful flow controls (STORE only, no store, sources).  
**Problems:** Off-system visuals; not linked in primary nav (only settings card) — OK; forms raw.  
**Visual:** 4/10 · **UX:** 7/10 (as tool)  
**Recommendation:** Restyle to tokens; keep out of primary IA.

### 9.11 Technician home

**Page:** העבודות שלי  
**Route:** `/tech`  
**Purpose:** Field tech job queue by tab.  
**Current structure:** Realtime hint; techId warning; segmented tabs; job cards.  
**What works:** Mobile-first width (`max-w-lg`); card rows; status/priority; tab counts.  
**Problems:** techId via query string is fragile UX; custom tabs not shared; bottom nav to HQ; Hebrew mixed with realtime zinc caption.  
**Desktop:** Acceptable narrow column.  
**Mobile:** Primary surface — good direction.  
**Visual:** 7/10 · **UX:** 7/10  
**Recommendation:** P0 polish — auth identity instead of query; use Tabs; remove HQ or bury.

### 9.12 Technician job detail

**Page:** Tech ticket  
**Route:** `/tech/[ticketId]`  
**Purpose:** Claim, progress, note, photo URL, resolve.  
**Current structure:** Status/priority/SLA; description; big action buttons; note/photo; events.  
**What works:** Large touch CTAs; clear status actions; back to list.  
**Problems:** **Strongest design-system break** (zinc/sky/emerald); photo URL only; SLA pill duplicate; success/error banners ad-hoc.  
**Desktop:** Narrow OK.  
**Mobile:** Right interaction model, wrong styling cohesion.  
**Visual:** 5/10 · **UX:** 7.5/10  
**Recommendation:** P0 — tokenize without changing flow; later real camera upload.

### 9.13 Modals / Drawers / Bottom sheets / Toasts

| Pattern | Exists? | Used? | Notes |
|---------|---------|-------|-------|
| Modal | Yes | No | Ready |
| Drawer | Yes | No | Ready |
| Bottom sheet | No | — | Needed for mobile assign/filters |
| Toast | Yes | Partial | Collides with bottom nav; Bamakor offsets `74px + safe-area` |

### 9.14 Empty / Loading / Error

| State | Coverage |
|-------|----------|
| Empty | EmptyState on tickets/reports/tech tabs; some inline empties |
| Loading | Almost none (no Skeleton usage; RSC waits blank) |
| Error | Tech has red banners; ticket actions text; login string; no shared ErrorCallout |
| Not found | `notFound()` on ticket routes |

---

## 10. Desktop UX

### Strengths

- Dense Issues table is the right HQ metaphor.
- Quiet color — low fatigue vs bright SaaS dashboards.
- Sticky header keeps IA available.
- Ticket detail two-column is appropriate for managers.

### Weaknesses

- Top nav only — weak for all-day muscle memory vs sidebar.
- Max width `max-w-7xl` is fine; widescreen underuses left hierarchy.
- No keyboard shortcuts / power filters.
- Simulator/login visual quality undercuts “enterprise” feel when democonnected.

### Desktop suitability for 6–8h: **promising (7/10) if Issues stays dense and color stays quiet.**

---

## 11. Mobile UX

### Strengths

- Ops bottom nav exists.
- Tech shell is intentionally mobile-first.
- Large tech action buttons.
- Filter chips wrap.

### Weaknesses

- Issues/Stores tables not redesigned for mobile.
- Settings unreachable from bottom nav.
- Toast vs bottom nav collision.
- No safe-area padding (`env(safe-area-inset-*)` absent in app shells).
- Tech `maximumScale: 1` hurts accessibility zoom.
- Touch targets: bottom nav text-only ~44px height OK vertically, but chips/links sometimes tight.

### Mobile suitability: **Tech 7/10 · Ops 5/10.**

---

## 12. PWA UX

### What exists

| Item | MaintainOS |
|------|------------|
| Manifest HQ | `/manifest.webmanifest` → start `/ops`, theme `#f7f7f5` |
| Manifest Tech | `/manifest-tech.webmanifest` → start `/tech`, theme `#8b1e2d` |
| Icons | SVG 192/512 with “OC” on burgundy |
| SW | Minimal shell cache + offline.html |
| Registration | Inline in root layout |
| Apple web app meta | Yes (root + tech layout) |

### Audit checklist

| Topic | Status | Feels like |
|-------|--------|------------|
| App shell | Partial (sticky header + bottom nav) | Website+ |
| Install | Possible | App-capable |
| Standalone | Declared | Untested polish gaps |
| Safe areas | **Missing** | Website |
| Header | Sticky blur | App-ish |
| Bottom nav | Fixed; no safe-area | Website on iPhone home indicator |
| Keyboard | Forms OK; 16px not enforced on mobile inputs (Bamakor forces 16px) | Risk of iOS zoom |
| Modals | Center modal only | Website |
| Scrolling | Standard document scroll | Website |
| Loading | No splash / page loader | Website |
| Offline | Basic static fallback | Minimal app |
| Deep links | Routes work; tech needs techId | Fragile |
| Refresh | Tech interval 30s + realtime | Good |
| Session | Magic link; pilot often bypasses | Weak |

### Bamakor PWA advantages to recycle

- `viewport-fit=cover` + `interactive-widget=resizes-content`
- `--mobile-bottom-nav-height: 64px`
- Toast anchored above bottom nav + safe-area
- Bottom sheet modal system (`app-modal-sheet-*`)
- Manifest shortcuts (new ticket, tickets, workers)
- Splash / page loader motion (optional; keep subtler)
- Coarse pointer min 44×44 on key controls

### Native-ish vs website

**Native-ish today:** tech job list metaphor, dual manifests, sticky chrome.  
**Still website:** safe areas, tables on phone, center dialogs, zinc pages, offline thinness, no install education UI.

---

## 13. Accessibility

### Failures / risks (clear)

1. **Color-only risk mitigated partially** — StatusDot includes text labels (good). Keep this.
2. **Contrast:** muted `#6b6b66` on `#f7f7f5` / white is generally OK; faint `#9a9a94` on canvas may fail small text WCAG AA in places.
3. **Focus:** Button/Input have `focus-visible:ring`; many raw `<a>` / tech `<button>` lack visible focus rings.
4. **Keyboard:** Tables are link-per-cell OK; FilterChips are links (OK); no skip link.
5. **Touch targets:** FilterChip `h-8` (32px) below 44px guidance; icon-less bottom nav OK height but cramped labels.
6. **Labels:** Login/simulator labels exist; some icon-only close buttons have `aria-label` (good).
7. **Semantics:** Headers exist; tables have `<th>` but no `<caption>` / scope.
8. **Screen reader:** Toasts not clearly announced (`aria-live` missing on toast region).
9. **Tech layout `maximumScale: 1`:** accessibility anti-pattern.
10. **RTL back affordance:** “← חזרה” may confuse; prefer logical “חזרה” without wrong-arrow.

### Priority a11y fixes (when implementing)

Toast live region · remove max scale lock · 44px filters on coarse pointers · focus rings on all actions · contrast check on faint text.

---

## 14. Bamakor Comparison (UX/UI infrastructure)

**Sources:** live `https://bamakor.vercel.app` (CSS/manifest/HTML reverse-engineering), prior architecture research, public `Bamakor_site` marketing scrape (not used for product UI).  
**Caveat:** Bamakor app source still private — infrastructure conclusions from shipped client assets.

| Area | MaintainOS | Bamakor | Better implementation | Recommendation |
|------|------------|---------|----------------------|----------------|
| Sidebar | None (top nav) | Mature app shell with richer IA (tickets/projects/residents/workers/…) | Bamakor for complex IA | Adopt **hybrid sidebar** for HQ growth; don’t copy property modules |
| Bottom nav | Text-only 4 items; no height token; Settings dropped | Dedicated height `64px`; safe-area aware; toasts offset | **Bamakor** | Recycle height token + safe-area + toast offset |
| Mobile shell | OpsShell/TechShell sticky + fixed nav | viewport-fit, overscroll control, touch-action, 100dvh | **Bamakor** | Port shell CSS practices |
| PWA | Dual manifests, minimal SW, offline page | Manifest + shortcuts + theme `#0066FF` + stronger install surface | Bamakor completeness | Add shortcuts; keep dual tech/HQ manifests |
| Table/list | Desktop table only on Issues/Stores | Dense tables + mobile adaptations (e.g. WA inbox pane swap) | **Bamakor** for mobile pane patterns | Issues: table/desktop + list/mobile |
| Worker portal | `/tech` separate PWA | `/worker` dedicated area | Tie — MaintainOS scope cleaner | Keep separate tech app; steal claim→progress→photo→done flow polish |
| Responsive layouts | Some grids; weak table story | Explicit mobile pane / sheet patterns | **Bamakor** | Recycle sheet + pane ideas |
| Forms | Mixed primitives vs raw | More consistent app UI kit (inferred) | Bamakor consistency | Enforce MaintainOS Input/Button |
| Drawers / sheets | Drawer unused; no sheet | Bottom sheets integrated with bottom nav | **Bamakor** | Recycle sheet behavior |
| Navigation consistency | HQ vs Tech diverge; HQ vs login diverge | Single product language + worker zone | Bamakor | One token system everywhere |
| Accent | Burgundy `#8b1e2d` | Blue `#0066FF` | Different brands — N/A | Keep OC tenant accent; MaintainOS neutrals |
| Typography | Heebo | Heebo + Inter + SF | Bamakor richer Latin | Keep Heebo; optional Inter later |
| Motion | Minimal | Splash + loaders | Bamakor more polished | Steal **subtle** page progress only; skip splash theater for HQ |

**Explicit recycle list from Bamakor**

1. Safe-area + bottom-nav height CSS variables  
2. Bottom sheet modal anchored above nav  
3. Toast stacking above nav  
4. Mobile min 44px on filters/tabs  
5. Manifest shortcuts  
6. Worker portal separation (already aligned)  
7. WA inbox mobile list/thread pane pattern — later for message pane  

**Do not recycle:** property IA, addon marketplace nav, blue brand system, splash-heavy marketing motion.

---

## 15. Optical Center Branding

### What we know

- Optical Center is a multi-country optical retail brand (FR origin; Israel site live).
- Public consumer sites emphasize **red** brand mark (“logo rouge” referenced on FR site). Exact official brand book HEX not available in-repo.
- Current MaintainOS accent `#8b1e2d` is a restrained burgundy — plausible OC-adjacent, not neon retail red.
- In-product mark is literally **“OC”** on accent tile — reads as Optical Center, not MaintainOS.

### Should we keep current accent?

**For Israel pilot: yes, keep burgundy as tenant accent.**  
**For MaintainOS product forever: no — don’t hard-wire OC red into the product core.**

### Proposed split

**Core neutral system (MaintainOS)**

- Canvas / surface / border / text / muted / faint  
- Semantic danger/warning/success/info  
- Radius, spacing, type  
- Default accent: neutral near-black primary actions OR a restrained product blue/gray — *decide later*  

**Optical Center branding layer (tenant)**

- `--accent`, `--accent-hover`, `--accent-soft` overrides  
- Optional logo image (customer)  
- Optional `theme_color` / PWA icon badge  
- Country label (“ישראל”) in context bar  

**Product mark**

- MaintainOS wordmark / abstract icon (not “OC”)  
- Customer logo secondary in top bar context  

This keeps the UI from becoming an Optical Center marketing skin while remaining on-brand for the pilot.

---

## 16. Product identity vs tenant branding (architecture)

Conceptual model (design only — not built):

```
ThemeProvider
  ├── product: MaintainOS
  │     logos.mark, logos.wordmark
  │     neutrals.*, semantics.*, radii.*, type.*
  │     defaultAccent (product)
  └── tenant: Optical Center / country deployment
        logos.customer
        accentOverride
        displayName, countryLabel
        pwa.themeColor?, icons?
```

| Concern | Owner | Mechanism |
|---------|-------|-----------|
| Product logo | MaintainOS | Static product assets |
| Customer logo | Tenant config | Org settings / env |
| Accent | Tenant override on product neutrals | CSS variables per org |
| Theme tokens | Product | `globals` + tenant patch |
| Country branding | Tenant + locale | Label + i18n, not separate theme |

**Rules**

1. Never encode customer initials as the only product icon.  
2. Accents may change; status semantics must not.  
3. Screenshots of “the product” should still look like MaintainOS after swapping tenant accent.

---

## 17. Recommended Design Direction

**North star:** White-first enterprise operational UI with Apple-level craft (not Apple marketing aesthetics).

| Decision | Recommendation |
|----------|----------------|
| **Background** | Keep `#f7f7f5` canvas (or `#f6f6f4`) |
| **Surface** | `#ffffff` bordered, flat |
| **Accent** | Tenant OC `#8b1e2d` for pilot; architect as override |
| **Typography** | Heebo; hierarchy in §4; tabular nums on |
| **Radius** | Keep 6/8/12; pills for filters/badges only |
| **Shadows** | Modal/sheet only; no card elevation |
| **Table density** | Keep `--row-h: 42px`; protect it |
| **Navigation** | Option C hybrid (sidebar desktop, bottom mobile) |
| **Mobile** | Dedicated lists for Issues/Stores; tech stays mobile-first |
| **Icons** | Add sparse line icons in nav (Lucide already in overlay); avoid icon decoration everywhere |
| **Motion** | 150–200ms color/opacity; sheet spring subtle; respect `prefers-reduced-motion` |
| **Status colors** | Keep quiet StatusDot model |

Translation of “Apple-level polish” here:

- One spacing/type system  
- Perfect alignment in tables  
- Touch targets & focus  
- Sheets that don’t fight the home indicator  
- No accidental zinc pages  

---

## 18. Prioritized Redesign Plan

### P0 Design — defines the product

1. **Issues** — mobile operational list + desktop table; filter IA cleanup  
2. **Issue Detail** — mobile sticky actions / sheet; unify tokens  
3. **Ops Overview** — real attention logic; denser scan  
4. **Technician experience** — tokenize detail/actions; identity; remove HQ trap  
5. **Navigation shells** — decide hybrid; fix mobile More/Settings; safe-areas  

### P1 Design — important operational flows

6. Stores mobile list (+ optional store detail)  
7. Login + auth chrome  
8. Toast/sheet/overlay system wired  
9. Shared loading skeletons + error callouts  
10. Settings vs Lab split  

### P2 Design — secondary

11. Reports real metrics or hide  
12. Simulator visual alignment  
13. Tooltips, shortcuts, advanced filters  
14. Product logo vs OC logo assets  
15. Manifest shortcuts / install UX  

---

## 19. What to Keep

Do **not** redesign these just to make them new:

- Operational Quiet palette and soft semantics  
- StatusDot / PriorityDot quiet language (color only when needed)  
- Dense table row height (~42px)  
- Border-first cards (no heavy shadows)  
- Heebo RTL foundation  
- Technician separate shell + job tabs metaphor  
- Dual PWA manifests (HQ vs tech)  
- Filter chip segment pattern on Issues  
- Honest empty states (Reports)  
- Ticket events + messages as operational truth panels  

---

## 20. What to Change

- Eliminate zinc/sky/emerald/amber drift  
- Issues & Stores mobile presentations  
- Nav architecture (hybrid) + mobile More  
- Safe-area / bottom-nav / toast / sheet PWA infrastructure (from Bamakor)  
- Branding architecture (product vs tenant)  
- Enforce Button/Input/Textarea/Card/SlaChip everywhere  
- Loading & error system  
- Tech identity model (not `?techId=`) as UX, when auth ready  

---

## 21. Desktop vs Mobile presentation matrix

| Screen | Same responsive component? | Needs dedicated mobile presentation? |
|--------|----------------------------|--------------------------------------|
| Landing | Yes | No |
| Login | Yes (narrow) | No |
| Ops Overview | Mostly yes | Minor (KPI stack already works) |
| **Issues** | **No** | **Yes — table vs operational list** |
| **Issue Detail** | Partial | **Yes — stacked + sticky/sheet actions** |
| **Stores** | **No** | **Yes — list; detail sheet later** |
| Reports | Yes | No |
| Settings | Yes | Better as list rows |
| Simulator | Two-column → stack | Acceptable stack |
| **Technician home** | Mobile-first | Already dedicated |
| **Technician detail** | Mobile-first | Already dedicated; polish only |
| Navigation | Different chrome | Desktop sidebar vs mobile bottom |

---

## 22. Long-session usability (manager, 6–8h)

| Factor | Assessment |
|--------|------------|
| Visual fatigue | Low on HQ quiet UI — strength |
| Information density | Good on Issues table; Overview slightly card-heavy |
| Scanning speed | StatusDot + number + store works; attention list needs better sorting |
| Clicks per task | Assign + status are short; search requires extra submit |
| Repetitive actions | No bulk actions / keyboard — future pain |
| Navigation friction | Top nav OK; mobile Settings missing; ticket back OK |
| Overly large components | Tech CTAs large (good for field); HQ mostly tight |
| Whitespace | HQ balanced; landing airy; empty states tall |
| Excessive color | Avoided on HQ; tech overuses semantic fills |
| Excessive borders | Border-heavy but cohesive — acceptable for ops |

**Conclusion:** Direction is correct for long HQ sessions. Biggest fatigue risk is **inconsistency** (tech/login) and **mobile table wrestling**, not the quiet palette.

---

## 23. What I would change in Yoni’s design direction

Honest pushback:

| Your preference | My professional take |
|-----------------|----------------------|
| White base | **Agree.** Keep off-white canvas, not pure marketing white full bleed. |
| Apple inspiration | **Agree as craft, not as aesthetic.** No big rounded marketing cards, no frosted consumer chrome on data tables. Apple Mail/Reminders density > Apple.com. |
| Sidebar | **Agree to move toward sidebar (hybrid),** not keep top-only forever. For 5 links top is OK short-term; for a real CMMS, sidebar wins. |
| Minimal color | **Strongly agree.** Protect StatusDot quietness; fix tech pages that violate it. |
| High information density | **Agree for HQ.** Don’t “beautify” Issues into card grids on desktop. |
| Full mobile access | **Agree,** but full access ≠ same layout. Issues must be a different presentation on phone. |
| OC accent everywhere | **Partial disagree.** Use as tenant layer; give MaintainOS its own mark. |
| Bottom nav text-only | **Disagree lightly.** Add simple icons + More; recycle Bamakor safe-area. |
| Dual PWA | **Agree — keep.** |

If we only do three things after this doc: **(1) unify tokens, (2) Issues mobile list, (3) PWA shell safe-area/sheets.**

---

## 24. Risks

1. Redesigning screen-by-screen recreates the current inconsistency.  
2. Copying Bamakor blue/splash would fight OC tenant branding and quiet HQ goals.  
3. Sidebar without RTL care can feel awkward — budget polish.  
4. Hiding Reports without communication may confuse stakeholders who expect dashboards.  
5. Over-branding OC makes multi-tenant expansion expensive later.  
6. Implementing sheets/modals without nav-height tokens repeats Bamakor bugs MaintainOS hasn’t earned yet.

---

## 25. Open Questions

1. Confirm nav: **Option C hybrid** vs stay top-nav for pilot?  
2. Keep `#8b1e2d` as pilot accent — do we have official OC brand HEX/logo files?  
3. Product name lock: MaintainOS forever, or temporary?  
4. Should Reports stay in primary nav during pilot?  
5. Technician auth model timeline (replacing `techId` query)?  
6. i18n priority: HE-only pilot vs EN/FR shell soon?  
7. Do we want one installable PWA or keep dual HQ/Tech manifests?  
8. Store Detail in MVP scope or later?  
9. Can we get Bamakor app repo access for exact component recycling (sheets/nav)?  
10. Demo chrome (seed buttons, simulator): visible to OC managers or env-flagged?

---

## Appendix A — Route map (complete)

| Route | Shell | Notes |
|-------|-------|-------|
| `/` | none | Portal |
| `/login` | none | Auth |
| `/ops` | OpsShell | Overview |
| `/ops/tickets` | OpsShell | Issues |
| `/ops/tickets/[id]` | OpsShell | Detail |
| `/ops/stores` | OpsShell | No `[id]` |
| `/ops/reports` | OpsShell | Placeholder |
| `/ops/settings` | OpsShell | Tool hub |
| `/ops/simulator` | OpsShell | Lab |
| `/tech` | TechShell | Jobs |
| `/tech/[ticketId]` | TechShell | Job detail |
| `/api/*` | — | Non-UI |

## Appendix B — File map (UI)

```
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/login/page.tsx
src/app/ops/**/page.tsx
src/app/tech/**
src/components/layout/ops-shell.tsx
src/components/layout/tech-shell.tsx
src/components/ui/{button,input,primitives,badges,overlay,tabs,toast}.tsx
src/components/ops/seed-demo-ticket-button.tsx
public/{manifest.webmanifest,manifest-tech.webmanifest,sw.js,offline.html,icons/*}
```

## Appendix C — Scoring snapshot

| Area | Score /10 |
|------|-----------|
| Token design quality | 8 |
| Token adoption | 5.5 |
| HQ desktop UX | 7.5 |
| HQ mobile UX | 5 |
| Tech mobile UX | 7 |
| PWA maturity | 5 |
| Accessibility | 5.5 |
| Cohesion (whole product) | 5.5 |
| Direction quality | 8 |

---

*End of audit. No visual refactor was performed in this deliverable.*
