# Meta WhatsApp — תבנית Follow-up אחרי 24 שעות

**מטרה:** לאפשר ל־HQ Ops לשלוח הודעה **מצד העסק** כשחלון ה־customer care (24 שעות מאז הודעת הלקוח האחרונה) נסגר.  
**קטגוריה:** `UTILITY` (לא Marketing — בהתאם ל־[`MESSAGING_COST_POLICY.md`](./MESSAGING_COST_POLICY.md)).  
**שימוש בקוד:** כפתור «שלח תבנית» ב־`/ops/inbox` → `sendSessionTemplate` → `WHATSAPP_SESSION_TEMPLATE`.

---

## פרטי התבנית להגשה ב־Meta Business Manager

| שדה | ערך |
|-----|-----|
| **Template name** | `maintainos_followup` |
| **Category** | Utility |
| **Language** | Hebrew (`he`) |
| **Header** | אין |
| **Footer** | אין (אופציונלי: `MaintainOS · Optical Center`) |

### Body (העתק ל־Meta)

```text
שלום, צוות התחזוקה של Optical Center כאן.
יש לנו עדכון לגבי דיווח שפתחתם.
נא להשיב להודעה זו כדי שנמשיך את השיחה.
```

### Buttons (Quick Reply) — מומלץ

| # | טקסט (עד 25 תווים) |
|---|---------------------|
| 1 | `אשמח לעדכון` |
| 2 | `הכל בסדר תודה` |

לחיצה של הלקוח = הודעה נכנסת → נפתח מחדש חלון 24 השעות → Ops יכול להמשיך בטקסט חופשי.

### Sample text (לשדה Sample ב־Meta)

אותו גוף כמו Body (אין משתנים).

### דוגמת JSON ליצירה ב־Graph API (אופציונלי)

```http
POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json
```

```json
{
  "name": "maintainos_followup",
  "language": "he",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "שלום, צוות התחזוקה של Optical Center כאן.\nיש לנו עדכון לגבי דיווח שפתחתם.\nנא להשיב להודעה זו כדי שנמשיך את השיחה."
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "אשמח לעדכון" },
        { "type": "QUICK_REPLY", "text": "הכל בסדר תודה" }
      ]
    }
  ]
}
```

---

## אחרי אישור Meta

1. ב־Vercel / `.env.local`:

```bash
WHATSAPP_SESSION_TEMPLATE=maintainos_followup
WHATSAPP_SESSION_TEMPLATE_LANG=he
```

2. ב־`/ops/inbox` — כשחלון 24ש׳ פג, לחצו **שלח תבנית**.
3. אל תשלחו תבנית כספאם סטטוסים (`assigned` / `in_progress`) — רק לפתיחת שיחה מחדש או עדכון קריטי מאושר.

---

## תבנית משנית (אופציונלי) — עדכון עם מספר תקלה

אם תרצו הודעה עם משתנה אחרי שה־follow-up אושר:

| שדה | ערך |
|-----|-----|
| **Name** | `maintainos_ticket_update` |
| **Category** | Utility |
| **Language** | `he` |

**Body:**

```text
עדכון לתקלה {{1}}: יש לנו מידע חדש מהצוות.
נא להשיב להודעה זו להמשך הטיפול.
```

**Sample:** `{{1}}` = `OC-10482`

שליחה עם פרמטר דורשת `bodyParameters` ב־`sendWhatsAppTemplate` (נתמך בקוד).

---

## למה לא Marketing?

Marketing templates יקרים יותר ומנוגדים למדיניות הפיילוט (דיווח תקלות, לא קמפיינים). Utility מיועדת לעדכוני שירות / המשך טיפול — בדיוק המקרה אחרי סגירת חלון 24 השעות.
