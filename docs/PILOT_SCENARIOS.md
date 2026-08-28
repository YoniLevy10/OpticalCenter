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

### צד בנייה
- [ ] `npm run db:migrate:ai-intake` (או הדבקת SQL ב־Supabase)
- [ ] `OPENAI_API_KEY` + `WHATSAPP_AI_INTAKE_ENABLED=true` ב־Vercel
- [ ] `MAINTAINOS_FORCE_MEMORY` **לא** set
- [ ] Storage bucket `ticket-media` עם policies
- [ ] `/api/health/pilot` → `buildSideReady: true`

### צד Meta (שלך)
- [ ] Meta WhatsApp webhook + credentials ב־Vercel
- [ ] `NEXT_PUBLIC_WA_BUSINESS_PHONE` / Ops settings מספר עסקי
- [ ] `countries.whatsapp_phone_number_id` = מזהה Meta אמיתי
- [ ] QR מודפס מחדש אחרי המספר
- [ ] `/api/health/pilot` → `readyForPilot: true`
