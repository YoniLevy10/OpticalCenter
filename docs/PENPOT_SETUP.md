# חיבור Penpot לסוכן Cursor (MILO)

כדי לעבוד מול Penpot **כמו מול Figma** (יצירת מסכים ישירות בקובץ ענן), צריך MCP של Penpot.

## מצב נוכחי

- יש מיזם/קובץ **MILO** ב־Penpot — מצוין.
- חיבור ב־**Cursor Desktop** לא מופיע אוטומטית אצל **Cloud Agent**.
- בריצה הזו אין עדיין namespace `penpot` / כלים כמו `high_level_overview` / `execute_code`.
- בינתיים: חבילת ייבוא מוכנה ב־`docs/ux-preview/penpot-import/` (PNG + SVG).

## ייבוא מיידי לפרויקט MILO

1. פתחו את קובץ **MILO** ב־[design.penpot.app](https://design.penpot.app)
2. גררו / `File → Import` את הקבצים מ־`docs/ux-preview/penpot-import/`
3. מומלץ להתחיל מ־`01-dashboard.png` + `board-dashboard.svg`, `05-login` / `board-login.svg`, `06-tech-home` / `board-tech-iphone.svg`

Preview חי: `npx --yes serve docs/ux-preview -p 4173`

## חיבור MCP לסוכן Cloud (ציור ישיר)

1. ב־Penpot: **Your account → Integrations → MCP Server**
   - Status: Enabled
   - Generate MCP key (נשמר פעם אחת)
   - Copy server URL (`https://design.penpot.app/mcp/stream?userToken=…`)
2. הוסיפו ל־**Cloud Agent Environment** (לא רק Desktop):
   - Secret בשם `PENPOT_MCP_URL` עם ה־URL המלא  
   - או רשומה ב־MCP settings של הסביבה:

```json
{
  "mcpServers": {
    "penpot": {
      "url": "https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY",
      "type": "http"
    }
  }
}
```

3. בקובץ **MILO**: **File → MCP Server → Connect** — השאירו את הטאב פעיל
4. חזרו לצ׳אט: «Penpot MCP מחובר לסוכן»

אחרי שהכלים מופיעים לסוכן — נבנה ישירות ב־MILO: Dashboard, Tickets, Login, Tech (iPhone).
