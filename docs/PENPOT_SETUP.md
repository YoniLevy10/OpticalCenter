# חיבור Penpot לסוכן Cursor (MILO)

כדי לעבוד מול Penpot **כמו מול Figma** (יצירת מסכים ישירות בקובץ ענן), צריך MCP של Penpot.

## למה לא עולה מעצמו

בסביבת הסוכן מחובר Figma MCP — **לא** Penpot.  
Penpot דורש:

1. MCP key מהחשבון שלכם ב־Penpot  
2. חיבור Plugin לקובץ פתוח (`File → MCP Server → Connect`)

בלי זה הסוכן יכול רק להכין preview HTML (`docs/ux-preview/`) לייבוא ידני.

## שלבים (Remote MCP — מומלץ)

1. פתחו [https://design.penpot.app](https://design.penpot.app)  
2. צרו קובץ: **MILO Design**  
3. **Your account → Integrations → MCP Server**  
   - Status: Enabled  
   - Generate MCP key (נשמר פעם אחת)  
   - Copy server URL (`https://design.penpot.app/mcp/stream?userToken=…`)  
4. הוסיפו ל־Cursor כ־MCP server בשם `penpot` עם ה־URL המלא  
5. בקובץ: **File → MCP Server → Connect** — השאירו את הטאב פעיל  
6. חזרו לצ׳אט: «Penpot מחובר — תעלה את מסכי MILO»

## Preview בינתיים

```bash
npx --yes serve docs/ux-preview -p 4173
```

גלריה: `docs/ux-preview/index.html` (MILO Alive · iPhone feel).
