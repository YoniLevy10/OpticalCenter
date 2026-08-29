# פיילוט WhatsApp — חלוקת אחריות

## צד בנייה (MaintainOS) — הושלם בקוד

- [x] AI Intake Agent + Rules Engine + clarification + takeover
- [x] Webhook fast-path (`after`) + signature + dedupe + send retries
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
   AI Gateway (`AI_GATEWAY_API_KEY` / OIDC) או `GOOGLE_GENERATIVE_AI_API_KEY` / `ANTHROPIC_API_KEY` + `WHATSAPP_AI_INTAKE_ENABLED=true`  
   (סובבו מפתח שנחשף בצ'אט)
3. אופציונלי: `SENTRY_DSN`, `CRON_SECRET`

בדיקה: `node scripts/pilot-readiness.mjs`  
או: `https://optical-center-rose.vercel.app/api/health/pilot`

---

## הצד שלך (Meta + מספר)

1. WhatsApp Business / Meta Cloud API — מספר פעיל  
2. ב־Vercel Production:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET`
   - `NEXT_PUBLIC_WA_BUSINESS_PHONE` (ספרות, למשל `9725…`)
3. Webhook Callback URL:  
   `https://optical-center-rose.vercel.app/api/whatsapp/webhook`  
   Verify token = אותו ערך כמו `WHATSAPP_VERIFY_TOKEN`  
   Subscribe: `messages`
4. עדכון DB (אחרי שיש Phone Number ID):
   ```bash
   node scripts/configure-whatsapp-country.mjs \
     --code=IL \
     --phone-number-id=<META_ID> \
     --display=9725...
   ```
5. שמירת המספר גם ב־Ops → הגדרות → WhatsApp (ל־QR)
6. הדפסת QR מחדש לפיילוט
7. (מומלץ) מיפוי טלפוני עובדים:
   ```bash
   node scripts/seed-store-phones.mjs --store=172 --wa=97250... --label="מנהל"
   ```
8. Smoke: סריקת QR → הודעת תקלה → תקלה ב־`/ops/tickets`

כש־`/api/health/pilot` מחזיר `"readyForPilot": true` — אפשר להתחיל עם 2–3 חנויות.
