# Network launch checklist — MaintainOS

**מטרה:** הקמת רשת / מדינה חדשה (retail) — לא בניין מ־Bino.  
**בריאות אוטומטית:** `GET /api/health/pilot` · `npm run pilot:readiness`

---

## 1. Meta / WhatsApp

- [ ] WABA + מספר עסקי למדינה (אחד למדינה)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_VERIFY_TOKEN` + `WHATSAPP_APP_SECRET`
- [ ] Webhook מצביע ל־`/api/whatsapp/webhook`
- [ ] תבנית Utility מאושרת: `maintainos_followup` (עברית)
- [ ] Env: `WHATSAPP_SESSION_TEMPLATE=maintainos_followup` · `WHATSAPP_SESSION_TEMPLATE_LANG=he`
- [ ] רשומה ב־`whatsapp_templates` עם `meta_name=maintainos_followup` (מיגרציה / מסך הגדרות)

מסמך תבנית: [`META_WHATSAPP_TEMPLATE_FOLLOWUP.md`](./META_WHATSAPP_TEMPLATE_FOLLOWUP.md)

## 2. אפליקציה / Vercel

- [ ] `NEXT_PUBLIC_APP_URL` = דומיין ייצור (לא vercel.app בקישורי SMS)
- [ ] Supabase URL + anon + service role
- [ ] `CRON_SECRET` ל־SLA / unassigned / lifecycle / **whatsapp-retry**
- [ ] מיגרציות כולל `whatsapp_send_failures`

## 3. סניפים ודיווח

- [ ] סניפים עם קודים + הדפסת QR (`/ops/stores/print-qr`)
- [ ] `NEXT_PUBLIC_WA_BUSINESS_PHONE` / הגדרות Ops → WhatsApp
- [ ] בדיקת דיווח WhatsApp end-to-end (סריקת QR → טיקט)

## 4. צוות

- [ ] משתמשי HQ (`global_admin` / `global_maintenance`)
- [ ] טכנאים עם טלפון ל־019SMS
- [ ] `SMS_019_*` (sender רשום ב־019)

## 5. אופציונלי אחרי go-live

- [ ] VAPID Web Push (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- [ ] Sentry (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`)

## 6. Smoke

```bash
npm run pilot:readiness
# או
curl -s "$APP_URL/api/health/pilot" | jq .
```

ב־Ops Inbox: שליחת תבנית אחרי חלון 24ש׳ · Cron whatsapp-retry לא מחזיר 401 עם `CRON_SECRET`.
