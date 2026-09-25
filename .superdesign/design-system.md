# MaintainOS × Optical Center — Premium redesign direction

**Document type:** Forward-looking design north star for Superdesign (not a snapshot of production CSS alone).  
**Product:** MaintainOS — multi-branch facility / operations OS; **Optical Center Israel** = first pilot tenant.  
**Locales:** Hebrew primary, **RTL** throughout.  
**Audiences:** HQ ops staff, field technicians, store managers.

---

## 1. Design thesis

**Operational Quiet** is the platform; **Optical Center** is the tenant heartbeat.

The interface should feel like a calm control room on a cool-teal atmospheric canvas—not a generic SaaS dashboard, not a clinical CRM, and not an “AI product” with purple gradients and floating orbs. Density and scan speed matter more than decoration. Every pixel should help someone decide: *what broke, where, how urgent, who owns it, what happened last*.

Tenant red (`#D92621`, OC diamond mark) is **precious**: primary CTAs, active nav accent, focus halos—not backgrounds, not chart palettes, not alert floods.

---

## 2. Brand & identity

### Optical Center tenant layer
- **Mark:** Red diamond + OC glasses (`BrandMark` assets). Use on shell headers, login hero, PWA splash—not repeated on every row.
- **Voice:** Professional Hebrew; short labels; avoid English except product names (WhatsApp, QR, NFC) where operators expect them.
- **MaintainOS platform:** Secondary wordmark in sidebar (“MaintainOS” + “Optical Center · ישראל” caption). Platform stays visually quieter than tenant mark.

### What we are not designing
- No invented “optical clinic CRM” (appointments, prescriptions, lens catalog).
- Real channels: **WhatsApp intake**, **QR/NFC store ID**, **tickets**, **tech portal**, **store portal**, **assets**, **vendors**, **reports**, **users/settings**.

---

## 3. Color & atmosphere

### Light-first canvas (mandatory default)
- **Canvas:** Cool teal-gray `#eef4f6` (existing `--canvas`) — slightly atmospheric, never flat `#fff` page fill.
- **Surfaces:** White cards with soft Bamakor-style elevation (`--shadow-1`), hairline borders `#d7e3e6`.
- **Ink:** Deep blue-green `#102b35` for primary text—grounded, not pure black.

**Avoid:** purple/indigo SaaS defaults, cream+terracotta “warm startup”, dark-mode-first marketing, neon gradients, glassmorphism stacks.

### Signal language (tenant-agnostic)
Keep three **orthogonal** encodings (already in code—preserve in redesign):

| Dimension | Visual channel | Examples |
|---|---|---|
| Priority | Leading **edge** bar | critical / high / medium |
| Status | **Typography** + small dot | new, in progress, resolved |
| SLA | **Tabular numerals** | live countdown |

Signal hues: critical red, warning amber-brown, progress blue, resolved green, idle gray—never swap in tenant red for “error”.

### Dark mode
Supported via token remap (`html.dark`), not the hero story. Auto schedule (19:00–07:00) for night shifts. Sidebar `--panel-dark` stays intentionally dark in both themes for HQ wayfinding.

---

## 4. Typography

### Primary: Heebo
Already loaded for Hebrew + Latin. Optimize for **RTL readability**: slightly negative letter-spacing on titles, comfortable line-height on body (13.5–15px operational body).

### Display pairing (optional upgrade)
If a second face is added, prefer a **compact Hebrew-friendly display** for page titles only (e.g. **Rubik** 600/700 or **Assistant** 700)—not Inter, not Space Grotesk clichés. Keep UI controls in Heebo for consistency.

### Type roles ( retain / refine )
- **Queue scan:** `.t-lead` titles in rows, `.t-num` for SLA and IDs.
- **HQ tables:** `.t-caption` headers, 44px row rhythm.
- **Never** shrink SLA or ticket IDs below WCAG contrast on canvas.

---

## 5. Layout & navigation patterns

### HQ (`AppShell`)
- **Desktop:** Persistent dark sidebar (216px)—tenant strip on active item, not full-width red bars.
- **Mobile:** Bottom nav for daily loop (ראשי, תקלות, WhatsApp, חנויות, עוד). Secondary tools in bottom sheet—not a hamburger maze.
- **Content max-width:** ~1280px; breathe on large monitors but keep tables dense.

### Technician (`TechShell`)
- Single-column, max-w-xl, **no HQ chrome**.
- Sticky thumb dock for primary job action (accept, update status, photo upload).
- 48px touch targets; high contrast on outdoor brightness.

### Store portal (`StoreShell`)
- Minimal tabs: my tickets / new report.
- Store name + code in header; tenant mark for trust.

### PageToolbar
Mobile-only wayfinding—don’t duplicate H1 on desktop.

---

## 6. Component redesign priorities

1. **OperationalRow / table row** — The product *is* the queue. Refine edge + SLA alignment; no cardification on mobile.
2. **Timeline** — Single story stream (WhatsApp + notes + status transitions). Consider subtle date grouping pills without chat-app cosplay on HQ (keep WA wallpaper only in inbox thread).
3. **Evidence grid** — Field photos are legal/operational proof; fast lightbox, broken-image fallback, no carousel autoplay.
4. **Segmented controls** — URL-synced queue filters with counts; active segment = white lift on sunken track.
5. **Inbox / WhatsApp takeover** — Familiar chat affordances for message context, but ticket strip and composer stay MaintainOS tokens (not full Meta clone on every screen).
6. **Login** — `login-brand-panel` gradient: tenant-soft radial on canvas—one “wow” moment, then straight to work.

---

## 7. Motion & feedback

- **Fast in, no bounce circus:** `--ease` cubic, 150–280ms.
- **List stagger:** Dashboard first paint only—never on ticket queues (operator fatigue).
- **Pull-to-refresh:** Subtle tenant-colored spinner—tech + HQ mobile.
- **Toasts:** Above bottom nav; success/critical border tint; optional action link in tenant color.
- **Respect `prefers-reduced-motion`.**

---

## 8. Accessibility & RTL

- Root: `dir="rtl"`, `lang="he"`.
- Logical properties (`start`/`end`, `inset-inline`) over physical left/right.
- Focus: tenant-tinted ring + offset halo (already global).
- Skip link, live regions for async updates, 44px tap minimum on mobile ops.

---

## 9. Anti-patterns (explicit ban list)

- Purple/blue AI “assistant” panels, sparkle icons, generic “insights” cards.
- Giant hero illustrations on operational pages.
- Badge soup (priority + status + SLA all as pills).
- Tenant red for destructive/error unrelated to brand actions.
- English-first microcopy on Hebrew surfaces.
- Fake data widgets (charts with no backend) on dashboard.

---

## 10. Premium visual refinements (phase 2)

- **Canvas depth:** Very subtle noise or radial vignette on `--canvas` (1–2% opacity) so long shifts feel less flat—must not harm contrast.
- **Sidebar:** Active item = tenant 2px rail + soft white/10 fill (current pattern)—consider micro-label for pilot environment.
- **Dashboard KPI strip:** Typographic numbers first, sparklines second (only with real data).
- **Print / QR flows:** High-contrast black on white for print; screen preview uses tenant accent sparingly.
- **Empty states:** One line of guidance + single CTA—no illustration stock art.

---

## 11. Success criteria

A redesign is successful when:

1. An HQ operator can scan a 30-ticket mobile queue by **edge + SLA + title** without reading badges.
2. A technician completes a job update **one-handed** without opening HQ nav.
3. A store manager submits a report in **under 60 seconds** from PWA home.
4. Optical Center staff recognize **OC red diamond** instantly; MaintainOS feels like **infrastructure**, not a rebrand of their retail site.
5. Light mode on `#eef4f6` feels **intentional and premium**, not “default Tailwind admin.”

---

## 12. Reference tokens (implementation anchor)

Use `theme.md` for full CSS. Minimum set for Superdesign variables:

```
--canvas: #eef4f6
--tenant: #D92621
--ink: #102b35
--signal-critical: #c01e1e
--signal-warning: #8a5a12
--signal-progress: #3b6cb8
--signal-resolved: #187348
--panel-dark: #102b35
--radius-md: 8px
--row-h: 44px
```

Font stack: `Heebo, system-ui, sans-serif`.

---

*This direction complements production code in `src/app/globals.css` and `docs/DESIGN_SYSTEM.md`. Superdesign explorations should prototype here first, then map back to existing primitives in `src/components/ui/`.*
