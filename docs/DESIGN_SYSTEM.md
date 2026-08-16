# MaintainOS — Operational Quiet v2

**Status:** Normative. Single source of truth for presentation.
**Source of tokens:** `src/app/globals.css` — do not invent parallel values in screens.
**Applies to:** every surface in `src/app/**`.

---

## 0. Principle

> **Color is a signal, not a surface.**

Ink and space carry hierarchy. Color is spent only where a decision is required.
Corollary: if everything is colored, nothing is urgent.

Two supporting rules:

1. **Differentiate by form, not by hue.** Priority, status and SLA are three orthogonal
   dimensions. They must never share a visual shape.
2. **Containers are the last resort.** Type and space first, then a divider, then a
   border, and only then a card.

### Restraint (v2)

Depth and motion exist, but most of the product stays quiet.

**Allowed “wow” moments (only these):**

1. **Login** — centered brand mark with `--shadow-pop`
2. **Dashboard exception / elevated surfaces** — rare `--shadow-hover` only where intentional (not default Panel)
3. **Modal** — `animate-scale-in` entrance

Everywhere else: color transitions, no bounce/scale on nav or queue rows, no list
stagger on daily queues. `.stagger` is reserved for dashboard first-impression lists.

---

## 0b. Ops console structure

### Dashboard — action console

1. Compact `PageHeader` (hidden on mobile when AppShell already titles the page)
2. **Stat strip** — peer metrics in one band (open / breached / unassigned); click → existing `queueHref`
3. Thin SLA banner (single line)
4. **Exception list** (hero) — up to 8 tickets: breached first, then unassigned; row → ticket detail
5. Secondary panels: category · technician load
6. Chart / load **bars use `--signal-progress` or ink** — never `--tenant`

### Queue — dense Linear-like chrome

- Mobile: hide page `PageHeader` (`hidden md:flex`)
- Attention counts live in the toolbar band (not a separate tall block)
- Desktop: store / tech / priority filters visible in the toolbar; BottomSheet is mobile-only
- Sticky table header; compact empty state inside flush Panel; dense pagination footer

### Panel elevation

`Panel` defaults to **border only** (no `--shadow-1`). Add shadow explicitly for
KPI/elevated moments, login brand, or modal — not for every card on the page.

## 1. Token architecture — three layers

### Layer 1 — Substrate (never tenant-themable)

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#eef0f4` | app background |
| `--surface` | `#ffffff` | panels, rows, sheets |
| `--surface-sunken` | `#e4e7ed` | table headers, inert fills, active nav rest |
| `--surface-raised` | `#ffffff` | floating surfaces (popover / dropdown) |
| `--border` | `#dce0e6` | default hairline |
| `--border-strong` | `#c4c9d2` | emphasis |
| `--ink` | `#1a1b1f` | primary text |
| `--ink-2` | `#62656e` | secondary text |
| `--ink-3` | `#9498a4` | tertiary / metadata |

### Layer 2 — Signal (identical for every tenant)

| Signal | Base | Soft | Meaning |
|---|---|---|---|
| `critical` | `#c01e1e` | `#fef0f0` | breach, critical priority, destructive |
| `warning` | `#c08020` | `#fdf5e6` | approaching breach, blocked |
| `progress` | `#3b6cb8` | `#eaf1fa` | actively being worked |
| `resolved` | `#1e8a5a` | `#e8f6ee` | done |
| `idle` | `#9498a4` | `#eef0f4` | no attention required |

### Layer 3 — Tenant

| Token | Value |
|---|---|
| `--tenant` | `#8b1e2d` |
| `--tenant-hover` | `#6e1825` |
| `--tenant-soft` | `#f9eef0` |
| `--tenant-line` | `#ecd8dc` |
| `--tenant-contrast` | `#ffffff` |

Permitted in **exactly three places**: logo mark · primary action fill · active nav
indicator. **Forbidden** on ticket status, priority, SLA, data rows, charts.

### Elevation & motion

| Token | Intent |
|---|---|
| `--shadow-1` | rare elevated rest (not default Panel) |
| `--shadow-2` | rare intermediate |
| `--shadow-hover` | intentional elevated hover only |
| `--shadow-pop` | modal / login mark / toast |
| `--dur-1` | `150ms` state |
| `--dur-2` | `280ms` surfaces |
| `--dur-3` | `400ms` rare long motion |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--radius-sm/md/lg/xl` | `6 / 8 / 12 / 16` |

---

## 2. Typography

Semantic roles only — **no arbitrary `text-[Npx]` in application code.**

| Role | Size / line | Weight | Use |
|---|---|---|---|
| `.t-display` | 26 / 1.2, `-0.025em` | 650 | one per screen max; KPI values |
| `.t-title` | 20 / 1.25, `-0.02em` | 600 | page title |
| `.t-section` | 14 / 1.4 | 600 | panel heading |
| `.t-lead` | 15 / 1.35 | 500 | mobile row primary line |
| `.t-body` | 13.5 / 1.5 | 400 | operational body |
| `.t-body-strong` | 13.5 / 1.5 | 550 | emphasis |
| `.t-meta` | 12 / 1.4 | 400 | secondary metadata |
| `.t-caption` | 11 / 1.35, `0.01em` | 500 | labels |
| `.t-control` | 13.5 / 1 | 500 | buttons, tabs |
| `.t-control-lg` | 15 / 1 | 500 | touch / block actions |

`.t-num` = tabular nums + slashed zero. Mandatory on ticket numbers, store codes,
SLA, age, counts, phones.

---

## 3. Spacing

Strict 4px grid. Layout tokens: `--row-h: 44px`, `--nav-w: 216px`,
`--topbar-h: 52px`, `--bottomnav-h: 56px`, `--tap: 44px`.

Content max width: `1280px`. Desktop content padding: `md:px-8`.

---

## 4. Signal encoding

### Priority → leading edge (3px inline-start)

| Priority | Treatment |
|---|---|
| `critical` | solid `--signal-critical` + critical row rest |
| `high` | critical at 45% opacity |
| `medium` | `--border-strong` |
| `low` | none |

No priority badges except the optional critical chip on mobile rows.

### Status → typography

Plain `--ink-2`. Markers only for blocked / resolved states.

### SLA → live tabular number

Time remaining, right-aligned. Warning ≤20% window; critical when breached.

---

## 5. Navigation

Desktop: **surface** sidebar, hairline `border-e`, **no sidebar shadow**.
Active nav: sunken fill + 2px tenant indicator. No translate / scale.

Mobile: blur top bar with page title; bottom nav active = **tenant color only**.

Primary: Dashboard · Tickets · Stores. Tools (settings, users, simulator, tech)
live in sidebar footer / More sheet.

Technicians: TechShell only — no HQ chrome.

---

## 6. Component rules

One system in `src/components/ui/`. Storybook for changed primitives.

Rules:

- No screen invents its own button, status pill, or form control.
- Visible `:focus-visible` (tenant halo + soft ring).
- Mobile controls ≥ `--tap` (44px); inputs 16px on mobile.
- Motion communicates; daily queues do not stagger or bounce.
- Toast may use `animate-slide-up`; modal uses `animate-scale-in`; sheets use
  `animate-slide-up`.

---

## 7. Non-happy path

Every route: `loading` (skeleton), empty, error. Offline honesty on tech surfaces.

---

## 8. RTL

Logical properties only (`ms/me`, `ps/pe`, `start/end`). Priority edge uses
`inline-start`. Latin IDs / phones / URLs: `dir="ltr"`.
