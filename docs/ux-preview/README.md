# MILO — UX Preview (Penpot)

Preview אינטראקטיבי (HTML/RTL) לכיוון **Alive Ops** של MILO.  
מיועד לצפייה מיידית ולייבוא / בניה ב־[Penpot](https://penpot.app).

**Figma הקודם:** נשאר כארכיון — מעכשיו העבודה הוויזואלית עוברת ל־Penpot.

## פתיחה מקומית

```bash
npx --yes serve docs/ux-preview -p 4173
```

[http://localhost:4173](http://localhost:4173)

## מסכים

| מסך | קובץ |
|------|------|
| גלריה | `index.html` |
| Dashboard | `screens/dashboard.html` |
| Tickets | `screens/tickets.html` |
| Login | `screens/login.html` |
| Tech (mobile) | `screens/tech-home.html` |
| (+ ישנים) | inbox, stores, store-portal, ticket-detail… |

## העלאה ל־Penpot (כמו Figma MCP)

בסביבת הסוכן **אין** Penpot MCP מחובר כברירת מחדל. כדי שהסוכן יבנה מסכים ישירות ב־`design.penpot.app`:

1. היכנסו ל־[design.penpot.app](https://design.penpot.app) וצרו קובץ `MILO Design`.
2. **Your account → Integrations → MCP Server** — הפעילו, צרו MCP key, העתיקו את ה־URL (כולל `userToken`).
3. הוסיפו את השרת ל־Cursor (MCP settings / `npx -y add-mcp -g -n penpot <URL>`).
4. בקובץ הפתוח: **File → MCP Server → Connect** (הטאב חייב להישאר פעיל).
5. כתבו לסוכן: «Penpot מחובר — בנה את מסכי MILO ב־Penpot».

### בלי MCP (ייבוא ידני)

1. Board לכל מסך (Desktop 1280×800 / Mobile 390×844).
2. פתחו את ה־HTML ב־serve, צלמו / ייצאו PNG כ־reference.
3. שכפלו עם הטוקנים מ־`preview.css` (tenant `#e11d2e`, signals Apple-like, glass panels).

## טוקנים מרכזיים

- Canvas atmosphere: `#eef3f8` → warm → soft red breath  
- Tenant: `#e11d2e`  
- Signals: blue `#007aff` · orange `#ff9f0a` · green `#34c759` · red `#ff3b30`  
- Glass chrome + capsule CTAs · RTL · Heebo
