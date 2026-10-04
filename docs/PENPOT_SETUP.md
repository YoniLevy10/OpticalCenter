# איך מחברים את MILO ל־Penpot ורואים מסכים

שני מסלולים. **מסלול 1** = רואים מסכים עכשיו. **מסלול 2** = הסוכן מצייר ישירות בקובץ.

---

## מסלול 1 — ייבוא מיידי (מומלץ עכשיו)

1. פתחו ב־Penpot את הקובץ **MILO**  
   https://design.penpot.app
2. `File → Import` (או גררו קבצים)
3. מהריפו / מהענף `cursor/milo-rebrand-midrag-cc05`:

```
docs/ux-preview/penpot-import/
  01-dashboard.png
  02-tickets.png
  03-ticket-detail.png
  04-inbox.png
  05-login.png
  06-tech-home.png      ← iPhone
  07-store-portal.png   ← iPhone
  board-dashboard.svg
  board-login.svg
  board-tech-iphone.svg
```

4. סדרו את הפריימים בעמוד אחד — זה התצוגה של מסכי MILO Alive.

Preview בדפדפן (אופציונלי):

```bash
npx --yes serve docs/ux-preview -p 4173
```

---

## מסלול 2 — חיבור MCP (הסוכן בונה מסכים בקובץ)

כמו ב־Bino PR #250. שתי שכבות:

| שכבה | מה | בלי זה |
|------|-----|--------|
| **A** | URL עם `userToken` | `init` נכשל |
| **B** | בקובץ MILO: File → MCP Server → Connect | `No Penpot instance connected` |

### שלבים

1. Penpot → Account → **Integrations → MCP Server** → Enabled → העתיקו את  
   `https://design.penpot.app/mcp/stream?userToken=…`
2. הוסיפו ל־**Cloud Agent** secret בשם:  
   `PENPOT_MCP_STREAM_URL`  
   (לא רק Desktop Customize — Cloud לא יורש את זה)
3. פתחו את קובץ **MILO** → **File → MCP Server → Connect** → השאירו טאב פתוח
4. בצ׳אט: «מחובר בקובץ MILO»

הסוכן יריץ:

```bash
export PENPOT_MCP_STREAM_URL='…'   # מהסוד
python3 scripts/penpot-mcp/penpot_mcp_client.py init
python3 scripts/penpot-mcp/penpot_mcp_client.py wait --timeout 120
# ואז execute_code לבניית Dashboard / Login / Tech
```

סקריפטים (הועתקו מ־Bino #250): `scripts/penpot-mcp/`

---

## למה «Connected» ב־Cursor לא מספיק

- Customize MCP ≠ הזרקה לסוכן Cloud  
- Connected ב־UI = שכבה A בלבד  
- בלי File→Connect על קובץ MILO אין ציור בקנבס
