# QA tooling notes

## Commands

| Script | Purpose |
|--------|---------|
| `npm test` | Vitest unit/API/domain |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:e2e` | Build + Playwright chromium |
| `npm run test:e2e:all` | All Playwright projects |
| `npm run test:qa` | lint + typecheck + unit + e2e + build |
| `npm run test:qa:load` | Synthetic 800×10k bottleneck JSON |

## Env

- Default E2E/webServer: `MAINTAINOS_FORCE_MEMORY=1`
- Supabase parity: unset force memory and provide live service role; tag/skip tests until green

## Artifacts

- Report: `docs/qa/PILOT_QA_REPORT.md`
- Load: `docs/qa/LOAD_REPORT.json`
- Screenshots: `e2e/*-snapshots/`
