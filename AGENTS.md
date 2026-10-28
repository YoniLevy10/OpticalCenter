# AGENTS.md — running this repo in the Base44 sandbox

Non-obvious facts about this project's local/sandbox runtime. Manifests and
`README.md` still describe the app itself.

## Start / stop

```bash
docker compose -f docker-compose.base44.yml up -d      # first boot runs `npm ci` (~30s)
docker compose -f docker-compose.base44.yml logs -f web
docker compose -f docker-compose.base44.yml down
```

One service (`web`): `node:22-bookworm-slim`, repo bind-mounted at `/app`,
`node_modules` in a named volume, `next dev --turbopack` on host port 3000.
Source edits hot-reload; nothing needs rebuilding. `next dev` must bind
`0.0.0.0` (already in the compose command).

## The preview runs in the app's demo backend — by design

`.env.example` describes a hosted Supabase project, but the app has a
first-class in-memory backend used by its CI and Playwright suite
(`.github/workflows/ci.yml` sets the same two variables):

```
MAINTAINOS_FORCE_MEMORY=1      # in-memory data store, seeded demo stores/tickets
MAINTAINOS_ALLOW_TEST_AUTH=1   # middleware injects the demo actor cookie
```

Consequences to remember:

- **No credentials are required to boot or use the app.** Supabase, Meta
  WhatsApp, Google Drive, Resend, 019SMS, Sentry and Web Push are optional
  integrations; the code only uses them when their env vars are set *and*
  `MAINTAINOS_FORCE_MEMORY !== '1'`.
- **Data is per-process.** Tickets created in the UI or via
  `/api/demo/whatsapp` disappear when the container restarts. Seeded data comes
  back on boot; `POST /api/demo/reset-memory` resets it without a restart.
- `GET /api/health` reports `"backend": "memory"` when this mode is active.
- Middleware (`src/middleware.ts`) injects `mos_test_actor` for `/ops`
  (HQ demo admin) and `/tech` (`DEMO_TECH_ID`) so pages render without login.
  Real Supabase session auth takes over as soon as `MAINTAINOS_FORCE_MEMORY`
  is unset and Supabase keys exist.

## Sandbox-only config

`next.config.ts` appends `3000-${BASE44_PUBLIC_HOST_SUFFIX}` and
`*.${BASE44_SANDBOX_HOST_DOMAIN}` to `allowedDevOrigins`, **only** when
`BASE44_PREVIEW_MODE === '1'`. Without those variables set (i.e. outside the
sandbox) the config is unchanged. Do not hardcode a resolved preview host.

## Checks

Run inside the container (the sandbox host has no Node runtime):

```bash
docker compose -f docker-compose.base44.yml exec -T web npm run typecheck
docker compose -f docker-compose.base44.yml exec -T web npm run lint
docker compose -f docker-compose.base44.yml exec -T web npx vitest run src/lib/phone.test.ts
```

Playwright (`npm run test:e2e`) is **not** runnable here without
`npx playwright install --with-deps chromium`; it also builds for `next start`.

## Known pre-existing noise

- `A conflicting public file and page file was found for path /favicon.ico`
  (`public/favicon.ico` + `src/app/favicon.ico`) — harmless, favicon returns 500
  in dev only.
- Sentry logs "Failed to register diagnostics-channel injection hooks" because
  no DSN is configured. Harmless.

## Navigating the preview programmatically

App-router client navigation works through real link clicks only; a synthetic
`history.pushState` navigation shows the old page. Wait ~3-4s after a click for
the RSC payload to render before asserting.
