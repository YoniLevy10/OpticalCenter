# תוכנית חיזוק ליבה + פיצ׳רים תפעוליים

**היקף:** בלי Zapier / outbound events כלליים.  
**מטרה:** מרכז שליטה יומי + סגירת פערי ליבה בזרימת תקלות.  
**בידול:** [`DIFFERENTIATION.md`](DIFFERENTIATION.md) — פיצ׳ר נכנס רק אם מחזק ליבה אחידה / Twin / תובנות רשת / שורש־עלות־מניעה.

## עקרונות

1. קודם מסך עבודה ברור (מה קורה / מה דורש טיפול / מה הפעולה הבאה).
2. פיצ׳רים רק אם סוגרים מחזור: דיווח → שיוך → טיפול → עדכון.
3. אין פיצ׳רים גנריים (ticketing / CMMS / custom-per-client) שלא מחזקים את הבידול.
4. Phase D (Push, i18n FR, OAuth domain) נשאר אחרי go-live IL.

## גל 1 — ליבה

| פריט | למה | סטטוס |
|------|-----|--------|
| דיאלוג «תקלה חדשה» מ־HQ (`?new=1`) | הכפתור היה שבור — אין יצירה מ־Ops | ✅ |
| דשבורד: ברכה + CTA ראשי + FAB | לפי `UX_IMPROVEMENT_PLAN` | ✅ |
| דשבורד: WhatsApp שממתינים לטיפול | «דורש תשומת לב» כולל Inbox | ✅ |
| דשבורד: ממתינות לחלקים בחריגים | נראות ל־`waiting_parts` | ✅ |
| רענון רך לדשבורד | מסך עבודה חי בלי realtime מלא | ✅ |

## גל 2 — פיצ׳רים תפעוליים

| פריט | הערה | סטטוס |
|------|------|--------|
| Persist של partner dispatch ל־Supabase | `vendor_dispatches` + fallback memory | ✅ |
| דוח חודשי מתוזמן + email | cron `0 6 1 * *` + snapshot + PDF | ✅ |
| PDF batch ל־QR | `/api/stores/qr-batch?format=pdf` | ✅ |
| התראת email ל־unassigned timeout | cron כל 15ד׳ · `UNASSIGNED_TIMEOUT_HOURS` | ✅ |

## מחוץ להיקף (נשאר אחרי go-live)

- Zapier / Make / n8n
- Web Push production
- i18n צרפת / Google domain MFA

## אבולוציה post-core (לא MVP)

אחרי יציבות ליבה ו־go-live IL — לפי מצפן הבידול:

1. **Digital Twin תפעולי לסניף** — ציוד, היסטוריה, ספקים, עלויות, תדירות כשל
2. **דפוסים בין־סניפיים** — ציוד בעייתי, recurrence ברמת רשת
3. **חיזוי והמלצות** — הוצאות צפויות + תחזוקה מונעת

לא מחליף את מחזור הדיווח→סגירה בפיילוט.
