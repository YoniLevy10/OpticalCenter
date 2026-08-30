# החלטות מוצר — פיילוט Optical Center IL

תיעוד החלטות הנהלה (Phase E + ישיבת מנהלים).

| נושא | החלטה | יישום |
|------|--------|--------|
| דוחות | CSV + Excel + PDF + dashboard מספיק; PDF לא חובה נפרד | `/api/reports/export?format=csv\|xlsx\|pdf` |
| היסטוריה | דוחות חודשיים נשמרים ידנית | `/ops/reports/history` + `report_snapshots` |
| התראות טכנאי | SMS (019) בשיוך + WhatsApp עם קישור `/tech` — כמו Bamakor; לא Web Push בפיילוט | Push UI «בקרוב» |
| Inbox reply | HQ יכול לשלוח WA (UI קיים); policy: takeover + ticket ops | ללא שינוי policy ב-wave זה |
| Auth | Google OAuth ראשי; מייל Supabase כגיבוי | `/login` + Supabase provider |
| עובדי חנות | פורטל `/store` — לא HQ מלא | `store_employee` role + `/store/report` |
| מדיה | תמונה + וידאו (עד 3), Bamakor-style | web + WA + tech upload |
| Phase D | PDF מתוזמן, i18n FR, OAuth domain, Push — **אחרי** go-live IL | «בקרוב» badges |

## שלב D — לא ב-wave הנוכחי

- i18n צרפת
- Web Push production + VAPID
- cron דוח חודשי + email
- Google domain restriction (MFA)
