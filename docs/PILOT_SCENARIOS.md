# תרחישי פיילוט — Supabase production

הריצו **אחרי** `npm run db:migrate` / `npm run db:migrate:ai-intake` על Supabase אמיתי (לא `MAINTAINOS_FORCE_MEMORY`).

מדד מוכנות חי: [`/api/health/pilot`](https://optical-center-rose.vercel.app/api/health/pilot) · Runbook: [`docs/META_PILOT_HANDOFF.md`](./META_PILOT_HANDOFF.md)

| # | תרחיש | צעדים | KPI |
|---|--------|--------|-----|
| 1 | דיווח WhatsApp | QR חנות → WA → תיאור + תמונה | תקלה ב-HQ < 60s |
| 2 | דיווח Web | `/report` → תיאור + נכס + וידאו | ticket + attachments |
| 3 | HQ triage | תור → שיוך טכנאי | WA notify < 30s |
| 4 | Tech field | קישור `/tech` → התחלה → סיום + תיעוד | status resolved |
| 5 | דוחות | `/ops/reports` → Excel/PDF + היסטוריה חודשית | export 200 OK |

## אימות אוטומטי (memory / CI)

Playwright: `e2e/pilot-scenarios.spec.ts` — זרימות 2–4 על memory backend.  
Unit: `npm test -- src/modules/whatsapp` (כולל WA-14 HVAC leak).

## Checklist production

**מוכנות (2026-09-09):** `/api/health/pilot` → `readyForPilot: true` (build + meta).  
אפשר להריץ את 5 התרחישים למעלה על פרודקשן.

### צד בנייה
- [x] מיגרציית AI Intake על Supabase (health: `schema_ai_intake`)
- [x] AI Gateway + intake מופעל (health: `ai_intake`)
- [x] `MAINTAINOS_FORCE_MEMORY` **לא** set
- [ ] Storage bucket `ticket-media` עם policies — לוודא ידנית במדיה
- [x] `/api/health/pilot` → `buildSideReady: true`

### צד Meta
- [x] Meta WhatsApp webhook + credentials ב־Vercel
- [x] `NEXT_PUBLIC_WA_BUSINESS_PHONE` / מספר עסקי מוגדר
- [x] `countries.whatsapp_phone_number_id` תואם ל־env
- [ ] QR מודפס לסניפי הפיילוט (מומלץ לפני הרחבה)
- [x] `/api/health/pilot` → `readyForPilot: true`
