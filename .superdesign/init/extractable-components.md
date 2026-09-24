# extractable-components.md — DraftComponent candidates

## AppShell
- Source: `src/components/layout/app-shell.tsx`
- Category: layout
- Description: HQ responsive shell — dark sidebar, mobile bottom nav, “more” tools sheet, pull-to-refresh hook.
- Extractable props: `tools` (NavTool[] subset — optional nav visibility)
- Hardcoded: primary nav labels (ראשי, תקלות, WhatsApp, חנויות, עוד), sidebar width, bottom nav height, BrandMark placement, LogoutButton, ThemeToggle, SystemStatusBanner

## TechShell
- Source: `src/components/layout/tech-shell.tsx`
- Category: layout
- Description: Field technician chrome — title header, optional back link, pull-to-refresh.
- Extractable props: `title` (string), `subtitle` (ReactNode), `backHref` (string), `backLabel` (string), `eyebrow` (string), `actions` / `headerActions` (slots), `enablePullToRefresh` (boolean)
- Hardcoded: tech PWA layout classes, safe-area padding, default back label Hebrew copy

## StoreShell
- Source: `src/components/layout/store-shell.tsx`
- Category: layout
- Description: Store portal — tab links for tickets list and new report.
- Extractable props: `storeName` (string), `storeCode` (string)
- Hardcoded: nav links (/store, /store/report), Hebrew labels, active route matching via pathname

## BrandMark
- Source: `src/components/brand/brand-mark.tsx`
- Category: basic
- Description: Official Optical Center mark (PNG) for headers, login, PWA.
- Extractable props: `size` (BrandMarkSize / number, default 32), `variant` ('black' | 'clear'), `className` (string), `priority` (boolean), `alt` (string)
- Hardcoded: asset paths MARK_BLACK / MARK_CLEAR, image dimensions

## PageToolbar
- Source: `src/components/layout/page-toolbar.tsx`
- Category: layout
- Description: Mobile page header — back, title, meta, refresh, action slot.
- Extractable props: `backHref`, `backLabel`, `title`, `meta` (ReactNode), `actions` (ReactNode), `onRefresh`, `showRefresh`, `className`
- Hardcoded: sticky topbar height, RTL flex order, RefreshButton / BackButton wiring

## BottomSheet
- Source: `src/components/ui/overlay.tsx` (export `BottomSheet`)
- Category: basic
- Description: Radix dialog-based bottom sheet for filters and secondary tools.
- Extractable props: `open` (boolean), `onOpenChange` (fn), `title` (string), `description` (string), `children` (slot)
- Hardcoded: drag handle, overlay blur, animation classes, portal z-index

## OperationalRow
- Source: `src/components/ui/operational-row.tsx`
- Category: basic
- Description: Primary queue list row — priority edge, leading/trailing slots, link wrapper.
- Extractable props: `href` (string), `priority` (string | null), `title` / `subtitle` / `footer` (ReactNode), `leading` / `trailing` (ReactNode), `className`
- Hardcoded: 44px row rhythm, priority edge colors, hover/active states, chevron

## StatusLabel
- Source: `src/components/ui/signal.tsx` (export `StatusLabel`)
- Category: basic
- Description: Ticket status text with signal dot and tone from `statusTreatment`.
- Extractable props: `status` (TicketStatus | string), `className`
- Hardcoded: Hebrew/plain labels via `plainStatus`, marker dot colors, typography classes

## Panel
- Source: `src/components/ui/primitives.tsx` (export `Panel`, `PanelHeader`)
- Category: basic
- Description: Section surface for dashboard blocks and detail columns.
- Extractable props: `Panel`: `flush`, `elevated`, `className`, HTML attrs; `PanelHeader`: `title`, `meta`, `action`
- Hardcoded: border, shadow tokens, sunken header bar, section semantics
