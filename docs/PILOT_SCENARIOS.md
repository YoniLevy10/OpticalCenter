# תרחישי פיילוט — Supabase production

הריצו **אחרי** `npm run db:migrate` על Supabase אמיתי (לא `MAINTAINOS_FORCE_MEMORY`).

| # | תרחיש | צעדים | KPI |
|---|--------|--------|-----|
| 1 | דיווח WhatsApp | QR חנות → WA → תיאור + תמונה | תקלה ב-HQ < 60s |
| 2 | דיווח Web | `/report` → תיאור + נכס + וידאו | ticket + attachments |
| 3 | HQ triage | תור → שיוך טכנאי | WA notify < 30s |
| 4 | Tech field | קישור `/tech` → התחלה → סיום + תיעוד | status resolved |
| 5 | דוחות | `/ops/reports` → Excel/PDF + היסטוריה חודשית | export 200 OK |

## אימות אוטומטי (memory / CI)

Playwright: `e2e/pilot-scenarios.spec.ts` — זרימות 2–4 על memory backend.

## Checklist production

- [ ] `NEXT_PUBLIC_SUPABASE_*` + service role ב-Vercel
- [ ] `npm run db:migrate` (Phase 6 + report_snapshots)
- [ ] Google OAuth provider ב-Supabase
- [ ] Meta WhatsApp webhook + credentials
- [ ] Storage bucket `ticket-media` עם policies
- [ ] `MAINTAINOS_FORCE_MEMORY` **לא** set ב-production
