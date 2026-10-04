# MILO → Penpot import pack

PNG boards + SVG frames לשימוש בקובץ **MILO** ב־Penpot.

## ייבוא מהיר (בלי MCP)

1. פתחו את קובץ **MILO** ב־[design.penpot.app](https://design.penpot.app)
2. `File → Import` או גררו את ה־PNG / SVG מתיקייה זו
3. סדרו לפי הסדר: `00-gallery` → `01-dashboard` … `07-store-portal`

| קובץ | גודל | תפקיד |
|------|------|--------|
| `00-gallery.png` | 1440×1100 | אינדקס |
| `01-dashboard.png` | 1440×900 | Desktop ops console |
| `02-tickets.png` | 1440×900 | תור תקלות |
| `03-ticket-detail.png` | 1440×900 | פרטי תקלה + מידרג |
| `04-inbox.png` | 1440×900 | WhatsApp inbox |
| `05-login.png` | 1440×900 | כניסה מותגית |
| `06-tech-home.png` | 430×932 | טכנאי iPhone |
| `07-store-portal.png` | 430×932 | פורטל סניף |
| `board-*.svg` | frames עריכים | נקודת התחלה וקטורית |

## MCP לסוכן Cloud (ציור ישיר)

חיבור ב־Cursor Desktop **לא** מספיק לסוכן Cloud.

1. Penpot → Account → Integrations → MCP Server → העתיקו URL עם `userToken`
2. הוסיפו secret `PENPOT_MCP_URL` לסביבת Cloud Agent **או** הכניסו ל־`.cursor/mcp.json` בסביבה
3. בקובץ MILO: `File → MCP Server → Connect` (השאירו טאב פתוח)
4. חזרו לצ׳אט: «Penpot MCP מחובר לסוכן»

אז הסוכן יוכל ליצור/לערוך פריימים ישירות במיזם MILO.
