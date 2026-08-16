# MaintainOS — Operational Quiet

**Status:** V1 design system. Normative.
**Applies to:** every surface in `src/app/**`. No screen may invent its own button, status pill, form control or spacing language.

---

## 0. Principle

> **Color is a signal, not a surface.**

Ink and space carry hierarchy. Color is spent only where a decision is required.
Corollary: if everything is colored, nothing is urgent.

Two supporting rules:

1. **Differentiate by form, not by hue.** Priority, status and SLA are three orthogonal
   dimensions. They must never share a visual shape, or the operator cannot scan a
   single dimension vertically.
2. **Containers are the last resort.** Express hierarchy with type and space first,
   then a divider, then a border, and only then a card.

---

## 1. Token architecture — three layers

Tokens live in `src/app/globals.css` under three strictly separated namespaces.

### Layer 1 — Substrate (`--canvas`, `--surface`, `--ink*`, `--border*`)

Defines MaintainOS itself. Never themable by a tenant. Never carries meaning.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#f7f7f5` | app background |
| `--surface` | `#ffffff` | panels, rows, sheets |
| `--surface-sunken` | `#f2f2ef` | table headers, inert fills |
| `--border` | `#e8e8e4` | default hairline |
| `--border-strong` | `#d4d4ce` | emphasis, focus rest state |
| `--ink` | `#1a1a18` | primary text |
| `--ink-2` | `#6b6b66` | secondary text |
| `--ink-3` | `#9a9a94` | tertiary / metadata |

### Layer 2 — Signal (`--signal-*`)

Operational semantics. **Identical for every tenant, forever.** Never used for
navigation, branding, or decoration.

| Signal | Base | Soft | Meaning |
|---|---|---|---|
| `critical` | `#b3261e` | `#fdf0ef` | breach, critical priority, destructive |
| `warning` | `#b07a1a` | `#fbf3e3` | approaching breach, blocked (waiting for parts) |
| `progress` | `#4a5d73` | `#eef1f5` | actively being worked |
| `resolved` | `#2f6b4f` | `#eaf4ee` | done |
| `idle` | `#9a9a94` | `#f2f2ef` | no attention required |

### Layer 3 — Tenant (`--tenant*`)

Customer identity. Lives in one block, overridable per tenant via a
`[data-tenant]` attribute without touching any other layer.

Permitted in **exactly three places**:

1. the logo mark
2. primary action fill
3. the active navigation indicator

**Forbidden:** ticket status, priority, SLA, any data row, any chart.

> Test: if Optical Center disappeared tomorrow, deleting the tenant block must leave a
> complete, coherent, monochrome-plus-signal product.

---

## 2. Typography

One scale. Semantic roles only — **no arbitrary `text-[Npx]` in application code.**

| Role | Size / line | Weight | Use |
|---|---|---|---|
| `.t-display` | 24 / 1.25, `-0.02em` | 600 | one per screen, max |
| `.t-title` | 19 / 1.3, `-0.015em` | 600 | page title |
| `.t-section` | 14 / 1.4 | 600 | panel heading |
| `.t-body` | 13 / 1.5 | 400 | operational body — the default |
| `.t-body-strong` | 13 / 1.5 | 500 | emphasis inside body |
| `.t-meta` | 12 / 1.4 | 400 | secondary metadata |
| `.t-caption` | 11 / 1.35 | 400 | labels, timestamps |
| `.t-control` | 13 / 1 | 500 | buttons, tabs, inputs |
| `.t-lead` | 15 / 1.35 | 500 | **mobile row primary line** |

`.t-num` applies `tabular-nums` + `slashed-zero`. Mandatory on: ticket numbers,
store codes, SLA, age, counts, phone numbers.

13px stays the desktop operational body. Mobile list rows step up to `.t-lead`
because they are scanned at arm's length, one-handed.

---

## 3. Spacing

Strict 4px grid — Tailwind's default scale. **No arbitrary spacing values.**

| Step | px | Use |
|---|---|---|
| 1 | 4 | intra-component |
| 2 | 8 | label ↔ control |
| 3 | 12 | row padding (dense) |
| 4 | 16 | panel padding, screen gutter |
| 5 | 20 | between panels |
| 6 | 24 | section separation |
| 8 | 32 | page rhythm |

Layout tokens: `--row-h: 44px`, `--nav-w: 216px`, `--topbar-h: 52px`,
`--bottomnav-h: 56px`, `--tap: 44px`.

---

## 4. Signal encoding — the core rule

Three dimensions, three **shapes**.

### Priority → leading edge

A 3px bar on the row's inline-start edge. Position-encoded, scannable down the
edge, costs zero horizontal space.

| Priority | Treatment |
|---|---|
| `critical` | solid `--signal-critical` bar + critical-tinted row rest state |
| `high` | solid `--signal-critical` bar at 45% opacity |
| `medium` | `--border-strong` bar |
| `low` | no bar |

Medium and low must not pollute the interface. No priority badges anywhere.

### Status → typography

Plain text in `--ink-2`. No pill, no dot — **except** blocked states, which earn a
2×2 marker:

- `waiting_parts` → warning marker (blocked; someone must act)
- `resolved` / `closed` → resolved marker
- everything else → text only

### SLA → live tabular number

The only live, right-aligned, numeric element in a row. Shows **time remaining**,
not policy.

| State | Render | Tone |
|---|---|---|
| > 20% of window left | `1h 18m` | `--ink-2` |
| ≤ 20% of window left | `42m` | `--signal-warning` |
| breached | `באיחור 27m` | `--signal-critical`, 500 weight |
| resolved / closed | `—` | `--ink-3` |

Live-ticking client-side on a single shared 30s interval, never one timer per row.

---

## 5. Navigation

**Decision: narrow light sidebar on desktop, bottom nav on mobile.**

Rationale: the top-bar + `max-w-7xl` container capped the table at the exact
resource dense tables need — horizontal space — and left nowhere to grow saved
views. The sidebar is 216px, canvas-colored, hairline-separated. It should read as
absence, not as a panel.

Primary destinations expose **only working product**:

| Destination | Route | Status |
|---|---|---|
| תקלות (Inbox) | `/ops/tickets` | primary, and the app home |
| חנויות | `/ops/stores` | primary |

`Overview` is demoted: `/ops` redirects to the inbox, and "what needs my attention"
is answered by the **attention strip** in the inbox header — three live counts that
are filter links, not KPI cards.

`Reports` is removed. It occupied a primary slot and a quarter of mobile navigation
with no product behind it.

`Settings` and the WhatsApp simulator are **tools**, not modules: reachable from the
sidebar footer / mobile More sheet, never from primary navigation.

Technicians get **no HQ navigation at all**.

---

## 6. Component rules

One system, in `src/components/ui/`. Consumed everywhere.

`Button` · `Input` · `Textarea` · `Select` · `SearchField` · `SegmentedControl` ·
`Table` · `OperationalRow` · `Modal` · `Drawer` · `BottomSheet` · `Toast` ·
`EmptyState` · `ErrorState` · `Skeleton` · `PageHeader` · `Panel` ·
`PriorityEdge` · `StatusLabel` · `SlaCell` · `Age` · `EvidenceGrid`

Rules:

- No screen defines its own button, status pill, or form control.
- Every interactive element has visible `:focus-visible` (2px tenant-tinted ring).
- Every interactive element on mobile is ≥ `--tap` (44px).
- Mobile inputs are 16px to prevent iOS zoom; ≥768px they step down to 13px.
- Motion: `--dur-1 120ms` for state, `--dur-2 200ms` for surfaces, one easing curve.
  Nothing moves that does not communicate.

---

## 7. Non-happy path

Every route ships `loading` (skeleton mirroring the real layout, never a spinner),
empty, and error states. Offline is handled by the service worker shell plus an
inline connectivity notice on technician surfaces.

---

## 8. RTL

Pilot is Hebrew RTL. All new layout uses **logical properties only** —
`ms/me`, `ps/pe`, `start/end`, `border-s/border-e`. No `left`/`right` in application
code. The priority edge uses `inline-start`, so it mirrors for LTR at zero cost.

Latin store names, ticket IDs, phone numbers and URLs are wrapped in `dir="ltr"`
inline spans so they render correctly inside Hebrew paragraphs.
