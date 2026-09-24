# pages.md — Key page dependency trees

Recursive local imports from `@/` and relative paths (excludes node_modules, Next.js, React, Lucide, Radix).

## /

**Entry:** `src/app/page.tsx`

Server redirect only — forwards auth query params to `/auth/callback`, then `redirect('/ops/dashboard')`. No local component imports.

```
(next/navigation)
```

## /login

**Entry:** `src/app/login/page.tsx`

```
  - `app/login/login-form.tsx`
    - `components/brand/brand-mark.tsx`
    - `components/layout/skip-link.tsx`
    - `components/theme/theme-toggle.tsx`
    - `components/ui/a11y.tsx`
    - `components/ui/button.tsx`
    - `components/ui/input.tsx`
    - `components/ui/primitives.tsx`
    - `lib/supabase/client.ts`
      - `lib/utils.ts`
      - `components/theme/theme-provider.tsx`
      - `lib/theme.ts`
```

## /ops/dashboard

**Entry:** `src/app/ops/dashboard/page.tsx`

```
  - `app/ops/dashboard/dashboard-soft-refresh.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/ops/plain-labels.ts`
  - `components/ui/button.tsx`
  - `components/ui/operational-row.tsx`
  - `components/ui/primitives.tsx`
  - `components/ui/signal.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/auth/ticket-scope.ts`
  - `lib/utils.ts`
  - `modules/ops/dashboard-kpis.ts`
  - `modules/tickets/queue.ts`
  - `modules/tickets/service.ts`
  - `modules/vendors/service.ts`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `modules/tickets/constants.ts`
    - `modules/tickets/sla-display.ts`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `modules/tickets/sla.ts`
    - `lib/auth/memory-memberships.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/system.ts`
    - `modules/stores/data.ts`
    - `modules/tickets/transitions.ts`
    - `lib/supabase/schema-fallback.ts`
    - `modules/vendors/match.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `components/ui/overlay.tsx`
      - `lib/supabase/admin.ts`
      - `lib/auth/pilot-users.ts`
      - `modules/vendors/preferred-seed.ts`
      - `modules/stores/israel-stores.ts`
      - `modules/stores/regions.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
```

## /ops/tickets

**Entry:** `src/app/ops/tickets/page.tsx`

```
  - `app/ops/tickets/purge-demo-button.tsx`
  - `app/ops/tickets/queue-tabs.tsx`
  - `app/ops/tickets/ticket-queue-item.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/layout/page-toolbar.tsx`
  - `components/ui/button.tsx`
  - `components/ui/primitives.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/auth/ticket-scope.ts`
  - `lib/supabase/tickets-client.ts`
  - `modules/tickets/queue.ts`
  - `modules/tickets/service.ts`
    - `lib/utils.ts`
    - `components/ops/plain-labels.ts`
    - `components/ui/input.tsx`
    - `components/ui/operational-row.tsx`
    - `components/ui/overlay.tsx`
    - `components/ui/signal.tsx`
    - `components/ui/toast.tsx`
    - `modules/tickets/constants.ts`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `components/layout/back-button.tsx`
    - `components/layout/refresh-button.tsx`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/scoped.ts`
    - `lib/supabase/system.ts`
    - `modules/tickets/sla-display.ts`
    - `modules/tickets/sla.ts`
    - `lib/auth/memory-memberships.ts`
    - `modules/stores/data.ts`
    - `modules/tickets/transitions.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `components/ui/a11y.tsx`
      - `lib/supabase/admin.ts`
      - `modules/vendors/preferred-seed.ts`
      - `lib/auth/pilot-users.ts`
      - `modules/stores/israel-stores.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
        - `modules/stores/regions.ts`
```

## /ops/tickets/[id]

**Entry:** `src/app/ops/tickets/[id]/page.tsx`

```
  - `app/ops/tickets/[id]/preferred-vendors-panel.tsx`
  - `app/ops/tickets/[id]/ticket-actions.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/layout/page-toolbar.tsx`
  - `components/ops/plain-labels.ts`
  - `components/ui/evidence.tsx`
  - `components/ui/primitives.tsx`
  - `components/ui/signal.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/auth/ticket-scope.ts`
  - `lib/supabase/tickets-client.ts`
  - `lib/utils.ts`
  - `modules/tickets/attachments.ts`
  - `modules/tickets/constants.ts`
  - `modules/tickets/service.ts`
  - `modules/vendors/fixly.ts`
  - `modules/vendors/service.ts`
    - `components/ui/button.tsx`
    - `components/ui/toast.tsx`
    - `components/ui/overlay.tsx`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `components/layout/back-button.tsx`
    - `components/layout/refresh-button.tsx`
    - `modules/tickets/queue.ts`
    - `modules/tickets/sla-display.ts`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/scoped.ts`
    - `lib/supabase/system.ts`
    - `lib/supabase/admin.ts`
    - `lib/auth/memory-memberships.ts`
    - `modules/stores/data.ts`
    - `modules/tickets/sla.ts`
    - `modules/tickets/transitions.ts`
    - `lib/supabase/schema-fallback.ts`
    - `modules/vendors/match.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `components/ui/a11y.tsx`
      - `modules/vendors/preferred-seed.ts`
      - `lib/auth/pilot-users.ts`
      - `modules/stores/israel-stores.ts`
      - `modules/stores/regions.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
```

## /ops/inbox

**Entry:** `src/app/ops/inbox/page.tsx`

```
  - `app/ops/inbox/inbox-client.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/layout/page-toolbar.tsx`
  - `components/ui/primitives.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
    - `components/ui/button.tsx`
    - `components/ui/input.tsx`
    - `components/ui/signal.tsx`
    - `components/ui/time.tsx`
    - `lib/utils.ts`
    - `modules/tickets/constants.ts`
    - `modules/whatsapp/human-pause.ts`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `components/layout/back-button.tsx`
    - `components/layout/refresh-button.tsx`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
      - `components/ops/plain-labels.ts`
      - `modules/tickets/sla-display.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `components/ui/overlay.tsx`
      - `components/ui/a11y.tsx`
      - `lib/auth/memory-memberships.ts`
      - `lib/data/memory-store.ts`
      - `lib/supabase/system.ts`
      - `lib/supabase/admin.ts`
        - `modules/tickets/queue.ts`
        - `modules/tickets/sla.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
        - `lib/auth/pilot-users.ts`
        - `modules/stores/data.ts`
        - `modules/vendors/preferred-seed.ts`
          - `modules/stores/israel-stores.ts`
          - `modules/stores/regions.ts`
```

## /ops/stores

**Entry:** `src/app/ops/stores/page.tsx`

```
  - `app/ops/stores/store-create-form.tsx`
  - `app/ops/stores/store-search.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/ui/button.tsx`
  - `components/ui/primitives.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/utils.ts`
  - `modules/stores/data.ts`
  - `modules/stores/regions.ts`
  - `modules/tickets/service.ts`
    - `components/ui/input.tsx`
    - `components/ui/overlay.tsx`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `lib/supabase/admin.ts`
    - `modules/stores/israel-stores.ts`
    - `lib/auth/memory-memberships.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/system.ts`
    - `modules/tickets/constants.ts`
    - `modules/tickets/sla.ts`
    - `modules/tickets/transitions.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `lib/auth/pilot-users.ts`
      - `modules/vendors/preferred-seed.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
```

## /ops/assets

**Entry:** `src/app/ops/assets/page.tsx`

```
  - `app/ops/assets/assets-admin.tsx`
  - `components/layout/ops-app-shell.tsx`
  - `components/layout/page-toolbar.tsx`
  - `components/ui/primitives.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `modules/stores/data.ts`
  - `modules/tickets/service.ts`
    - `components/assets/asset-labels.tsx`
    - `components/assets/barcode-scanner.tsx`
    - `components/ui/button.tsx`
    - `components/ui/input.tsx`
    - `components/ui/overlay.tsx`
    - `components/ui/table.tsx`
    - `lib/utils.ts`
    - `modules/assets/barcode.ts`
    - `modules/assets/service.ts`
    - `components/layout/app-shell.tsx`
    - `lib/auth/nav-access.ts`
    - `components/layout/back-button.tsx`
    - `components/layout/refresh-button.tsx`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `lib/supabase/admin.ts`
    - `modules/stores/israel-stores.ts`
    - `lib/auth/memory-memberships.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/system.ts`
    - `modules/tickets/constants.ts`
    - `modules/tickets/sla.ts`
    - `modules/tickets/transitions.ts`
      - `lib/supabase/schema-fallback.ts`
      - `components/auth/logout-button.tsx`
      - `components/brand/brand-mark.tsx`
      - `components/layout/pull-to-refresh.tsx`
      - `components/layout/skip-link.tsx`
      - `components/ops/system-status-banner.tsx`
      - `components/theme/theme-toggle.tsx`
      - `components/ui/a11y.tsx`
      - `lib/auth/pilot-users.ts`
      - `modules/vendors/preferred-seed.ts`
        - `components/theme/theme-provider.tsx`
        - `lib/theme.ts`
        - `modules/stores/regions.ts`
```

## /tech

**Entry:** `src/app/tech/page.tsx`

```
  - `app/tech/tech-job-list.tsx`
  - `app/tech/tech-push-subscribe.tsx`
  - `components/layout/refresh-button.tsx`
  - `components/layout/tech-shell.tsx`
  - `components/ui/primitives.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/auth/types.ts`
  - `lib/tech-href.ts`
  - `modules/tickets/constants.ts`
  - `modules/tickets/tech.ts`
    - `components/ops/plain-labels.ts`
    - `components/ui/operational-row.tsx`
    - `components/ui/signal.tsx`
    - `components/ui/button.tsx`
    - `components/ui/coming-soon-badge.tsx`
    - `components/auth/logout-button.tsx`
    - `components/brand/brand-mark.tsx`
    - `components/layout/back-button.tsx`
    - `components/layout/pull-to-refresh.tsx`
    - `components/layout/skip-link.tsx`
    - `components/theme/theme-toggle.tsx`
    - `lib/utils.ts`
    - `lib/auth/roles.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `lib/supabase/admin.ts`
      - `modules/tickets/queue.ts`
      - `modules/tickets/sla-display.ts`
      - `components/ui/a11y.tsx`
      - `components/theme/theme-provider.tsx`
      - `lib/theme.ts`
      - `lib/auth/memory-memberships.ts`
      - `lib/data/memory-store.ts`
      - `lib/supabase/system.ts`
        - `modules/tickets/sla.ts`
        - `lib/auth/pilot-users.ts`
        - `modules/stores/data.ts`
        - `modules/vendors/preferred-seed.ts`
          - `modules/stores/israel-stores.ts`
          - `modules/stores/regions.ts`
```

## /store

**Entry:** `src/app/store/page.tsx`

```
  - `components/ui/button.tsx`
  - `components/ui/primitives.tsx`
  - `components/ui/signal.tsx`
  - `lib/auth/home-path.ts`
  - `lib/auth/server-actor.ts`
  - `lib/auth/ticket-scope.ts`
  - `modules/stores/data.ts`
  - `modules/tickets/queue.ts`
  - `modules/tickets/service.ts`
    - `lib/utils.ts`
    - `components/ops/plain-labels.ts`
    - `modules/tickets/constants.ts`
    - `modules/tickets/sla-display.ts`
    - `lib/auth/roles.ts`
    - `lib/auth/types.ts`
    - `lib/auth/demo-session.ts`
    - `lib/auth/load-memberships.ts`
    - `lib/supabase/server.ts`
    - `modules/tickets/tech.ts`
    - `lib/supabase/admin.ts`
    - `modules/stores/israel-stores.ts`
    - `modules/tickets/sla.ts`
    - `lib/auth/memory-memberships.ts`
    - `lib/data/memory-store.ts`
    - `lib/supabase/system.ts`
    - `modules/tickets/transitions.ts`
      - `lib/auth/pilot-users.ts`
      - `modules/vendors/preferred-seed.ts`
        - `modules/stores/regions.ts`
```
