# MaintainOS — UX/UI Preview

Preview אינטראקטיבי (HTML/RTL) לכיוון ה־UX החדש, לפי [`UX_IMPROVEMENT_PLAN.md`](../UX_IMPROVEMENT_PLAN.md) ו־[`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

**למה לא Penpot ישירות?** אין אינטגרציית Penpot בסביבת הסוכן. ה־preview הזה הוא מקור ויזואלי מלא לייבוא ל־[Penpot](https://penpot.app) (פריימים / צילומי מסך / שכפול ידני), וגם לצפייה מיידית בדפדפן.

## פתיחה מקומית

משורש הריפו:

```bash
npx --yes serve docs/ux-preview -p 4173
```

ואז: [http://localhost:4173](http://localhost:4173)

או פתיחה ישירה של `docs/ux-preview/index.html` בדפדפן.

## מסכים (היקף ממוקד)

| מסך | קובץ | תפקיד |
|------|------|--------|
| גלריה | `index.html` | מפת מסכים |
| Dashboard | `screens/dashboard.html` | קונסולת פעולה יומית |
| Tickets | `screens/tickets.html` | תור צפוף |
| Ticket Detail | `screens/ticket-detail.html` | מטא + ציר זמן + פעולות |
| WhatsApp Inbox | `screens/inbox.html` | רשימה → שיחה |
| Stores / Detail | `screens/stores.html`, `store-detail.html` | מדריך סניפים |
| Login | `screens/login.html` | רגע מותג |
| Store Portal | `screens/store-portal.html` | עובד סניף (מובייל) |
| Tech Jobs / Detail | `screens/tech-home.html`, `tech-job.html` | PWA טכנאי |

מחוץ להיקף בשלב זה (לפי סדר התוכנית): Assets, Vendors, Activity, Reports, Users, Settings, Status, Simulator, Print QR — אפשר להרחיב באותו מבנה.

## ייבוא ל־Penpot

1. פתחו פרויקט חדש ב־[design.penpot.app](https://design.penpot.app) או בשרת Penpot עצמי.
2. צרו Board לכל מסך (Desktop 1280×800 ל־Ops; Mobile 390×844 ל־Store/Tech).
3. לכל מסך: פתחו את ה־HTML ב־serve, צלמו / ייצאו SVG/PNG, והדביקו כ־reference frame — או שכפלו ידנית עם הטוקנים מ־`preview.css`.
4. טוקנים מרכזיים: `--canvas #eef4f6`, `--ink #102b35`, `--tenant #d92621`, אותות critical/warning/progress/resolved.

## עקרונות שמוצגים כאן

- Dashboard = מסך עבודה (חריגים + SLA), לא דשבורד סטטיסטיקות
- צבע = אות תפעולי בלבד; tenant אדום OC לפעולות ו־nav פעיל
- Sidebar דסקטופ + bottom nav במובייל
- RTL + Heebo; מספרים ב־`t-num` / `dir=ltr`
