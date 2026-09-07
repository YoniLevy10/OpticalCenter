# תוכנית חיבור מחדש — מספר WhatsApp → Meta App חדש → Vercel → בוט

**הקשר (ספט׳ 2026):** המספר הוכנס בטעות ל־Meta App של פרויקט אחר, הוסר משם, ונפתח **Meta App חדש** לפרויקט Optical Center. צריך לחבר מחדש את המספר + לעדכן credentials בפרודקשן.

**עקרון:** שלב אחד בכל פעם. לא מדלגים. אחרי כל שלב בודקים ✅ ואז ממשיכים.

**יעד:** מספר עסקי מחובר ל־Meta App **החדש** → Webhook ל־Vercel → הבוט עונה ופותח תקלות.

---

## מצב נוכחי (פרודקשן)

`GET https://optical-center-rose.vercel.app/api/health/pilot`

| בדיקה | סטטוס |
|--------|--------|
| Build / Supabase / AI Intake | ✅ מוכן |
| Env vars של Meta קיימים ב־Vercel | ✅ מוגדרים (אבל מהאפליקציה הישנה) |
| Graph API send (`meta_graph_send_ready`) | ❌ `The application does not belong to system user's business…` |
| `readyForPilot` | ❌ false |

**משמעות:** הטוקן / האפליקציה ב־Vercel לא תואמים ל־WABA של המספר. חיבור מחדש ל־App החדש יפתור את זה.

---

## מפת הדרך (5 שלבים)

| שלב | מה | מי | סטטוס |
|-----|-----|-----|--------|
| **1** | וידוא מספר פנוי + Meta App חדש מוכן | אתה | ⬅️ עכשיו |
| **2** | הוספת המספר ל־WhatsApp ב־App החדש + העתקת credentials | אתה | ממתין |
| **3** | עדכון Vercel env + Webhook + Redeploy | יחד (כאן) | ממתין |
| **4** | עדכון DB (`countries` + QR) | כאן | ממתין |
| **5** | Smoke test מהטלפון → תקלה ב־Ops | יחד | ממתין |

---

## שלב 1 — הכנה (עכשיו)

### 1.1 צ׳קליסט לפני חיבור ל־App החדש

- [ ] יש לך **Meta App חדש** (Developers) עם מוצר **WhatsApp** מחובר
- [ ] ה־App משויך ל־**Business Manager** הנכון (אותו Business שמחזיק את ה־WABA)
- [ ] המספר **הוסר** מה־App / WABA הישן (לא נשאר "תקוע" שם)
- [ ] המספר **לא** פעיל כרגע ב־WhatsApp אישי / Business App על טלפון
- [ ] המספר יכול לקבל **SMS** (או שיחת אימות) לאימות Meta
- [ ] רשמת את המספר בפורמט: `9725XXXXXXXX` (בלי `+` ו־`-`)

### 1.2 מה לשלוח לי כשסיימת שלב 1

1. שם / App ID של ה־Meta App החדש (מספר בלבד, לא סוד)
2. המספר בפורמט `9725…`
3. האם המספר כבר הופיע תחת WhatsApp → API Setup באפליקציה החדשה? (כן/לא)
4. האם קיבלת / תוכל לקבל SMS לאימות עכשיו?

---

## שלב 2 — Meta (אחרי שלב 1)

1. [developers.facebook.com](https://developers.facebook.com/) → האפליקציה **החדשה**
2. מוצר **WhatsApp** → **API Setup**
3. **Add phone number** → אימות ב־SMS / שיחה
4. העתק (בלי לשתף בצ׳אט ציבורי אם אפשר — העדף הודעה פרטית / Vercel env ישירות):
   - **Phone number ID**
   - **WhatsApp Business Account ID** (WABA) — לוידוא שהמספר ב־Business הנכון
   - **Temporary access token** (או System User token קבוע — מומלץ לפיילוט ארוך)
   - **App Secret** (Settings → Basic)
5. בחר **Verify token** משלך (מחרוזת אקראית חזקה) — נשתמש בו גם ב־Vercel וגם ב־Webhook

### מה לשלוח לי לסיום שלב 2

| שדה | למה |
|-----|-----|
| `WHATSAPP_PHONE_NUMBER_ID` | מזהה המספר ב־Graph |
| `WHATSAPP_ACCESS_TOKEN` | שליחה / הורדת מדיה |
| `WHATSAPP_APP_SECRET` | אימות חתימת webhook |
| `WHATSAPP_VERIFY_TOKEN` | אימות webhook (GET) |
| `NEXT_PUBLIC_WA_BUSINESS_PHONE` | ספרות בלבד, למשל `972552819086` |

---

## שלב 3 — Vercel + Webhook (יחד)

Webhook Callback URL:

`https://optical-center-rose.vercel.app/api/whatsapp/webhook`

1. Vercel → Project **optical-center** → Settings → Environment Variables → **Production**
2. עדכון / החלפה של:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET`
   - `NEXT_PUBLIC_WA_BUSINESS_PHONE`
3. **Redeploy** Production (env חדשים לא נכנסים בלי deploy)
4. Meta → WhatsApp → Configuration → Webhook:
   - Callback URL = כתובת למעלה
   - Verify token = אותו ערך כמו `WHATSAPP_VERIFY_TOKEN`
   - Subscribe: **`messages`**

---

## שלב 4 — DB / QR

```bash
node scripts/configure-whatsapp-country.mjs \
  --code=IL \
  --phone-number-id=<PHONE_NUMBER_ID_מה_APP_החדש> \
  --display=9725...
```

מעדכן `countries.whatsapp_phone_number_id` + `app_settings.wa_business_phone` (ל־QR).

אחרי זה: Ops → `/ops/stores/print-qr` — הדפסה מחדש אם המספר הציבורי השתנה.

---

## שלב 5 — בדיקה

1. `GET /api/health/pilot` → `readyForPilot: true` ו־`meta_graph_send_ready: true`
2. WhatsApp למספר: `STORE_172` → `המזגן לא עובד`
3. תקלה מופיעה ב־`/ops/tickets`

---

## עצור כאן

**עכשיו רק שלב 1–2 ב־Meta.**  
סיים חיבור המספר ל־App החדש, שלח את ה־credentials מהטבלה למעלה — ואז נעדכן כאן Vercel + DB + נריץ smoke.
