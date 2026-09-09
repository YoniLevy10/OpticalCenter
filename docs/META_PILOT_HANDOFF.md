# פיילוט WhatsApp — חלוקת אחריות

## צד בנייה (MaintainOS) — הושלם בקוד

- [x] AI Intake Agent + Rules Engine + clarification + takeover
- [x] Webhook sync process (verify → intake → Graph reply → 200) + signature + dedupe + send retries
- [x] Ticket creation דרך השירות הקיים → Ops dashboard
- [x] מדיה → `ticket-media`
- [x] QR/NFC deep link `STORE_{code}` (דורש מספר עסקי)
- [x] `GET /api/health/pilot` — מדד מוכנות (build vs meta)
- [x] סקריפטים: `apply-migration`, `configure-whatsapp-country`, `seed-store-phones`, `pilot-readiness`
- [x] מיגרציה `20260827230000_whatsapp_ai_intake.sql` בריפו

### מה שעדיין דורש הרצה חד־פעמית (לא Meta)

1. **מיגרציית AI** על Supabase `pfsxuylbnpbcgjehuaqo`  
   SQL Editor → הדביקו את הקובץ, או:  
   `SUPABASE_DB_PASSWORD=… node scripts/apply-migration.mjs`
2. **Vercel env ל־AI**  
   AI Gateway בלבד: `AI_GATEWAY_API_KEY` או OIDC (`vercel env pull`) + `WHATSAPP_AI_INTAKE_ENABLED=true`  
   (סובבו מפתח שנחשף בצ'אט)
3. אופציונלי: `SENTRY_DSN`, `CRON_SECRET`

בדיקה: `node scripts/pilot-readiness.mjs`  
או: `https://optical-center-rose.vercel.app/api/health/pilot`

---

## הצד שלך (Meta + מספר) — הושלם בפרודקשן

**סטטוס (2026-09-09):** `/api/health/pilot` → `readyForPilot: true` · `metaSideReady: true` · Graph מאשר `+972 55-281-9086`.

חיבור Meta App החדש + Vercel env + webhook + DB — **סגורים**.  
Runbook לחיבור מחדש / תקלות: [`WHATSAPP_PHONE_CONNECT_PLAN.md`](./WHATSAPP_PHONE_CONNECT_PLAN.md).

### צעדים שכבר בוצעו (לתיעוד)

1. WhatsApp Business / Meta Cloud API — מספר פעיל ב־App / WABA הנכון
2. `WHATSAPP_*` + `NEXT_PUBLIC_WA_BUSINESS_PHONE` ב־Vercel Production
3. Webhook: `https://optical-center-rose.vercel.app/api/whatsapp/webhook` · Subscribe: `messages`
4. `configure-whatsapp-country` / סנכרון IL ב־DB
5. מספרים ממופים לחנויות (health: store_phones ✅)

### לפני הרחבת פיילוט

1. Smoke מהטלפון: QR / `STORE_{code}` → תקלה ב־`/ops/tickets`
2. (אופציונלי) הדפסת QR מ־`/ops/stores/print-qr` לסניפי הפיילוט
3. בחירת 2–3 חנויות להתחלה
