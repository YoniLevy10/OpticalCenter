# Optical Clean V2 — Design System

**Status:** Normative. Single source of truth for presentation.  
**Source of tokens:** `src/app/globals.css` — do not invent parallel values in screens.  
**Applies to:** every surface in `src/app/**`.  
**Reference:** Bamakor for restraint and finish quality — never copy Bamakor blue `#0066FF`.

---

## Principle

> Quiet. Fast. Precise. Premium. Obvious.

- Few visual decisions.
- Clear hierarchy.
- Generous whitespace.
- Almost no decoration.
- Color only when it means something.
- One language on every screen.

If choosing between “more interesting” and “cleaner” → **cleaner**.  
If unsure whether something needs color → **no**.  
If unsure whether to add a Card → **no**.

---

## Tokens

### Canvas & surfaces

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F9F9FB` | App background |
| `--surface` | `#FFFFFF` | Cards, tables, sidebar, modals |
| `--surface-sunken` | `#F5F5F7` | Table headers, inert fills, hover |
| `--border` | `#E5E5EA` | Hairlines |
| `--border-strong` | `#D2D2D7` | Emphasis borders |
| `--ink` | `#1D1D1F` | Primary text |
| `--ink-2` | `#6E6E73` | Secondary text |
| `--ink-3` | `#8E8E93` | Caption / meta |

### Primary — Optical Wine

| Token | Value |
|---|---|
| `--tenant` | `#8B1E2D` |
| `--tenant-hover` | `#741824` |
| `--tenant-soft` | `#F8ECEF` |
| `--tenant-contrast` | `#FFFFFF` |

**Only** for: primary CTA, active nav, focus, important links, selected, progress tint, highlights.

### Semantic (state only — never full card fills)

| Signal | Base |
|---|---|
| Success | green |
| Warning | orange |
| Critical | red |

Less than **10%** of any screen should be chromatic.

### Radius

| Level | Value | Use |
|---|---|---|
| Controls | `8px` (`--radius-md`) | Buttons, inputs |
| Cards | `12px` (`--radius-lg`) | Panels, tables |
| Modals | `16px` (`--radius-xl`) | Sheets, dialogs |

Pills only for badge / filter chip / avatar.

### Shadow

Default cards: **none** (border only).  
Optional hairline: `0 1px 2px rgba(0,0,0,.03)`.  
Meaningful shadow reserved for modal / popover / drawer.

### Spacing (4px grid)

`4 · 8 · 12 · 16 · 24 · 32 · 48`  
Desktop page padding: `32px` · Mobile: `16px` · Section gap: `32px`

---

## Typography (Heebo)

| Role | Size / Weight |
|---|---|
| Page title | Black plate · 18–20px / 600 · white on `#1D1D1F` |
| Section | 18px / 600 |
| Card title | 15px / 600 |
| Body | 14px / 400 |
| Secondary | 13px / 400 |
| Caption | 12px / 500 |
| KPI number | 30–32px / 600 |

One **H1** per page — compact black title plate only. No eyebrows, descriptions, or meta under the title.

---

## Shell

- **Light sidebar** (`#FFFFFF`, 220–232px), border `#E5E5EA`.
- Active item: soft wine tint `#F8ECEF`, wine text/icon — no glow, no leading bar.
- Mobile bottom nav (5): סקירה · תקלות · WhatsApp · חנויות · עוד.

### Nav hierarchy

**Primary:** סקירה · תקלות · WhatsApp · חנויות · דוחות  
**Secondary:** נכסים · ספקים · משתמשים  
**System:** הגדרות · סטטוס מערכת · מעבדה (+ tools under More)

---

## Dark mode

Light mode is the source of truth for Optical Clean V2.  
Do not maintain a parallel visual language during this redesign wave.

---

## Build order

1. Foundation (tokens, shell, primitives)  
2. Dashboard · Tickets · Ticket detail  
3. Inbox · Stores · Reports  
4. Assets · Vendors · Users · Settings · Tech/Store portals
