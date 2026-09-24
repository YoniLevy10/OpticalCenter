# routes.md — page map

Next.js App Router · Hebrew RTL · MaintainOS × Optical Center

| Path | File | Layout | Summary |
|------|------|--------|--------|
| `/login` | `src/app/login/page.tsx` | Root (`src/app/layout.tsx`) only | Pilot login with BrandMark, theme toggle, Supabase auth. |
| `/ops/activity` | `src/app/ops/activity/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Ops activity / audit feed. |
| `/ops/assets` | `src/app/ops/assets/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Asset registry — equipment, barcode, store linkage. |
| `/ops/assets/scan` | `src/app/ops/assets/scan/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Barcode scan flow for asset lookup. |
| `/ops/dashboard` | `src/app/ops/dashboard/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | HQ command center — KPIs, SLA pulse, queue snapshot. |
| `/ops/inbox` | `src/app/ops/inbox/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | WhatsApp inbox — threads, intake, human takeover. |
| `/ops/lab` | `src/app/ops/lab/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Internal lab / experiments. |
| `/ops` | `src/app/ops/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Ops section redirect/hub. |
| `/ops/reports/history` | `src/app/ops/reports/history/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Historical report snapshots. |
| `/ops/reports` | `src/app/ops/reports/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Reports hub — generate operational reports. |
| `/ops/settings` | `src/app/ops/settings/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Ops settings — notifications, WhatsApp, pilot toggles. |
| `/ops/simulator` | `src/app/ops/simulator/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | WhatsApp intake simulator (demo). |
| `/ops/status` | `src/app/ops/status/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | System status / health. |
| `/ops/stores/[code]` | `src/app/ops/stores/[code]/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Single store profile — contacts, tickets, QR. |
| `/ops/stores` | `src/app/ops/stores/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Store directory — network list and health. |
| `/ops/stores/print-qr` | `src/app/ops/stores/print-qr/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Bulk QR print sheet for store codes. |
| `/ops/tickets/[id]` | `src/app/ops/tickets/[id]/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Ticket detail — timeline, status, media, assignments. |
| `/ops/tickets` | `src/app/ops/tickets/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Ticket queue — filters, search, operational rows. |
| `/ops/users` | `src/app/ops/users/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Users and roles administration. |
| `/ops/vendors` | `src/app/ops/vendors/page.tsx` | OpsAppShell (`src/app/ops/layout.tsx` → `AppShell`) | Preferred vendors management. |
| `/` | `src/app/page.tsx` | Root (`src/app/layout.tsx`) only | Auth callback forwarder; redirects to `/ops/dashboard`. |
| `/privacy` | `src/app/privacy/page.tsx` | Root (`src/app/layout.tsx`) only | Privacy policy (legal). |
| `/report` | `src/app/report/page.tsx` | Root (`src/app/layout.tsx`) only | Shared/public ticket report entry. |
| `/store` | `src/app/store/page.tsx` | StoreShell (`src/app/store/layout.tsx`) | Store portal home — open tickets, quick actions. |
| `/store/report` | `src/app/store/report/page.tsx` | StoreShell (`src/app/store/layout.tsx`) | Store new issue report form. |
| `/store/tickets/[id]` | `src/app/store/tickets/[id]/page.tsx` | StoreShell (`src/app/store/layout.tsx`) | Store-facing ticket view and updates. |
| `/tech/[ticketId]` | `src/app/tech/[ticketId]/page.tsx` | TechShell (`src/app/tech/layout.tsx`) | Field ticket workspace — checklist, media, status. |
| `/tech` | `src/app/tech/page.tsx` | TechShell (`src/app/tech/layout.tsx`) | Technician home — assigned tickets list. |
| `/terms` | `src/app/terms/page.tsx` | Root (`src/app/layout.tsx`) only | Terms of use (legal). |
