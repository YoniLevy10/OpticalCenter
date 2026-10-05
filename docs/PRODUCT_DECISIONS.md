# החלטות מוצר — פיילוט Optical Center IL

תיעוד החלטות הנהלה (Phase E + ישיבת מנהלים).  
מצפן בידול: [`DIFFERENTIATION.md`](DIFFERENTIATION.md).

| נושא | החלטה | יישום |
|------|--------|--------|
| בידול / היקף | MILO = OS תפעולי לרשתות; לא ticketing גנרי ולא custom-per-client. ליבה אחידה; משתנה רק מיתוג, הרשאות, סוגי תקלות, SLA | `docs/DIFFERENTIATION.md` |
| דוחות | CSV + Excel + PDF + dashboard מספיק; PDF לא חובה נפרד | `/api/reports/export?format=csv\|xlsx\|pdf` |
| היסטוריה | דוחות חודשיים נשמרים ידנית | `/ops/reports/history` + `report_snapshots` |
| התראות טכנאי | WhatsApp עם קישור `/tech` (SMS כבוי כברירת מחדל — `SMS_019_ENABLED=1` להפעלה); Web Push כש־VAPID מוגדר | `lib/sms/019.ts` + `modules/push/send.ts` |
| Inbox reply | HQ יכול לשלוח WA (UI קיים); policy: takeover + ticket ops | ללא שינוי policy ב-wave זה |
| Auth | Google (Gmail מאושר) או מייל+סיסמה שסופקו ע״י מנהל; ללא כניסה פתוחה | `/login` + allowlist + Users admin |
| תפקידים | 4 בלבד: מנהל מערכת, תפעול, חנות, טכנאי | `docs/ROLES_AND_ACCESS.md` |
| עובדי חנות | פורטל `/store` — לא HQ מלא | `store_employee` role + `/store/report` |
| מדיה | תמונה + וידאו (עד 3), Bamakor-style | web + WA + tech upload |
| Phase D | PDF מתוזמן + email — **הושלם** (`/api/cron/monthly-report`); i18n FR, OAuth domain, Push — **אחרי** go-live IL | «בקרוב» ל־Push / i18n |

## שלב D — אחרי go-live IL

- i18n צרפת
- ~~Web Push production + VAPID~~ (זמין כש־`VAPID_*` מוגדרים)
- ~~cron דוח חודשי + email~~ (הושלם בגל 2)
- Google domain restriction (MFA)
