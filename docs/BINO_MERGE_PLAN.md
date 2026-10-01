# Bino → MaintainOS — תוכנית מיזוג

**סטטוס:** נורמטיבי  
**מטרה:** להעתיק מ־[YoniLevy10/Bino](https://github.com/YoniLevy10/Bino) רק יכולות פלטפורמה שמתאימות ל־OS תפעולי לרשתות — בלי דומיין בניינים/ועד.

בידול MaintainOS: [`DIFFERENTIATION.md`](./DIFFERENTIATION.md).

---

## SKIP — לא מיישמים

| יכולת Bino | סיבה |
|------------|------|
| דיירים / resident portal / pending residents | לא עובדי סניף |
| גבייה Grow / VaadPay / collections | ועד בית |
| נוכחות / NFC משמרות / attendance | כוח אדם בניין |
| יומן משרד / Google Calendar כליבה | addon בניין |
| Billing plans + מכסות | לא פיילוט OC; רק אם SaaS רב־רשתות בעתיד |
| Superadmin sales-leads / sandbox | פאנל מכירות Bino |
| Worker token כ־auth ראשי | `/tech` עם תפקידים נכון יותר |

---

## COPY / ADAPT — מה כן

| יכולת | פעולה | מימוש |
|--------|--------|--------|
| WhatsApp retry + Meta errors | COPY/ADAPT | `whatsapp_send_failures` + cron |
| Templates admin UI | ADAPT | `/ops/settings/whatsapp-templates` |
| Country WA credentials | ADAPT | settings + send fallback ל־DB |
| Launch checklist | ADAPT | `NETWORK_LAUNCH_CHECKLIST.md` |
| Cursor differentiation + auth safety | COPY (rewrite) | `.cursor/rules/*` |
| Web Push VAPID send | ADAPT | `modules/push/send.ts` |
| Sentry full SDK | ADAPT | `@sentry/nextjs` |

---

## סדר שלבים

0. Docs + Cursor rules  
1. WA retry queue  
2. Templates UI + country credentials  
3. Network launch checklist  
4. Web Push  
5. Sentry SDK  
