# תוכנית חיבור מחדש — מספר WhatsApp → Meta App חדש → Vercel → בוט

**סטטוס (ספט׳ 2026):** החיבור ל־Meta App החדש **הושלם**. פרודקשן מדווח `readyForPilot: true`.

מסמך זה נשאר כ־**runbook** לחיבור מחדש בעתיד + פתרון תקלות. לא לחסום פיילוט על בסיס הסטטוס הישן למטה.

---

## מצב נוכחי (פרודקשן) — מאומת

`GET https://optical-center-rose.vercel.app/api/health/pilot`  
(נבדק 2026-09-09)

| בדיקה | סטטוס |
|--------|--------|
| Build / Supabase / AI Intake | ✅ מוכן |
| Env vars של Meta ב־Vercel | ✅ תואמים ל־App הנוכחי |
| Graph API send (`meta_graph_send_ready`) | ✅ מאשר את מספר הבוט (`+972 55-281-9086`) |
| DB ↔ env (IL phone number id) | ✅ תואם |
| `readyForPilot` | ✅ **true** |

**משמעות:** אפשר להתחיל פיילוט 2–3 חנויות. הצעד הבא = smoke מהטלפון + בחירת סניפים — לא חיבור Meta.

---

## מפת הדרך (5 שלבים) — היסטוריה

| שלב | מה | סטטוס |
|-----|-----|--------|
| **1** | וידוא מספר פנוי + Meta App חדש מוכן | ✅ הושלם |
| **2** | הוספת המספר ל־WhatsApp ב־App החדש + credentials | ✅ הושלם |
| **3** | עדכון Vercel env + Webhook + Redeploy | ✅ הושלם |
| **4** | עדכון DB (`countries` + QR) | ✅ הושלם |
| **5** | Smoke test מהטלפון → תקלה ב־Ops | ⬅️ מומלץ לוודא לפני הרחבת חנויות |

---

## Runbook — חיבור מחדש (אם נדרש שוב)

### שלב 1 — הכנה

- [ ] יש **Meta App** עם מוצר **WhatsApp** מחובר
- [ ] ה־App משויך ל־**Business Manager** הנכון (אותו Business שמחזיק את ה־WABA)
- [ ] המספר **הוסר** מ־App / WABA ישן (לא נשאר "תקוע")
- [ ] המספר **לא** פעיל כ־WhatsApp אישי / Business App על טלפון
- [ ] המספר יכול לקבל **SMS** (או שיחת אימות)
- [ ] מספר בפורמט: `9725XXXXXXXX` (בלי `+` ו־`-`)

### שלב 2 — Meta

1. [developers.facebook.com](https://developers.facebook.com/) → האפליקציה
2. מוצר **WhatsApp** → **API Setup**
3. **Add phone number** → אימות ב־SMS / שיחה
4. העתק ל־Vercel (לא לצ׳אט ציבורי אם אפשר):
   - **Phone number ID**
   - **WhatsApp Business Account ID** (WABA)
   - **Access token** (System User קבוע מומלץ לפיילוט ארוך)
   - **App Secret** (Settings → Basic)
5. בחר **Verify token** משלך — אותו ערך ב־Vercel וב־Webhook

| שדה | למה |
|-----|-----|
| `WHATSAPP_PHONE_NUMBER_ID` | מזהה המספר ב־Graph |
| `WHATSAPP_ACCESS_TOKEN` | שליחה / הורדת מדיה |
| `WHATSAPP_APP_SECRET` | אימות חתימת webhook |
| `WHATSAPP_VERIFY_TOKEN` | אימות webhook (GET) |
| `NEXT_PUBLIC_WA_BUSINESS_PHONE` | ספרות בלבד, למשל `972552819086` |

### שלב 3 — Vercel + Webhook

Webhook Callback URL:

`https://optical-center-rose.vercel.app/api/whatsapp/webhook`

1. Vercel → Project **optical-center** → Settings → Environment Variables → **Production**
2. עדכון / החלפה של משתני `WHATSAPP_*` + `NEXT_PUBLIC_WA_BUSINESS_PHONE`
3. **Redeploy** Production
4. Meta → WhatsApp → Configuration → Webhook:
   - Callback URL = כתובת למעלה
   - Verify token = אותו ערך כמו `WHATSAPP_VERIFY_TOKEN`
   - Subscribe: **`messages`**

### שלב 4 — DB / QR

```bash
node scripts/configure-whatsapp-country.mjs \
  --code=IL \
  --phone-number-id=<PHONE_NUMBER_ID> \
  --display=9725...
```

מעדכן `countries.whatsapp_phone_number_id` + `app_settings.wa_business_phone` (ל־QR).

אחרי זה: Ops → `/ops/stores/print-qr` — הדפסה מחדש אם המספר הציבורי השתנה.

### שלב 5 — בדיקה

1. `GET /api/health/pilot` → `readyForPilot: true` ו־`meta_graph_send_ready: true`
2. WhatsApp למספר: `STORE_172` → `המזגן לא עובד`
3. תקלה מופיעה ב־`/ops/tickets`

---

## אם הבוט לא עונה (אחרי Verify הצליח)

בדיקה מסודרת — מהנפוץ לנדיר:

1. **Webhook → Subscribe: `messages`**  
   ב־Meta → WhatsApp → Configuration / Webhooks → ודא ש־`messages` מסומן.  
   Verify לבד לא מספיק.

2. **App ב־Development**  
   אם האפליקציה לא Published — רק מספרי **Admin / Developer / Tester** מקבלים webhooks.  
   הוסף את מספר ה־WhatsApp שממנו כותבים.  
   לפרסום האפליקציה ב־Meta:
   - Privacy Policy: `https://optical-center-rose.vercel.app/privacy`
   - Terms of Service: `https://optical-center-rose.vercel.app/terms`

3. **`WHATSAPP_APP_SECRET` מה־App הנכון**  
   Secret ישן → Vercel logs: `invalid_signature` → הבוט שותק.

4. **סנכרון Phone Number ID ב־DB**:
   ```sql
   update countries
   set whatsapp_phone_number_id = '<PHONE_NUMBER_ID>',
       whatsapp_display_phone = '972552819086'
   where code = 'IL';
   ```

5. **Human pause** על הצ׳אט:
   ```sql
   update intake_sessions
   set human_takeover = false, human_takeover_until = null
   where wa_id like '%<סיומת_המספר>%';
   ```
   או ב־Ops → Inbox → Resume bot.

6. Smoke: שלח `STORE_172` ואז `המזגן לא עובד`.
