# תוכנית עיצוב מחדש ב־Figma — MILO

**סטטוס:** Preview חי ב־Figma · כיוון **Alive Ops** (Apple Liquid Glass + Linear density)  
**מוצר:** MILO (Optical Center = דייר ראשון)  
**Figma Preview:** https://www.figma.com/design/g2dW3BXCSohnIGYbLBxuOC  
**יישור:** [`DIFFERENTIATION.md`](./DIFFERENTIATION.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · [`UX_IMPROVEMENT_PLAN.md`](./UX_IMPROVEMENT_PLAN.md)  
**כלי:** Figma MCP (מחובר) · Code Connect · יישום בקוד אחרי אישור ויזואלי  

### כיוון ויזואלי נוכחי (v2 — Alive)
- השראה: **Apple iOS 26/27 Liquid Glass** (כרום צף, חומר שקוף־למחצה, specular עדין) + צפיפות **Linear / Stripe**
- יותר צבע מערכת: כחול `#007aff` · כתום `#ff9f0a` · ירוק `#34c759` · אדום אות `#ff3b30` + אדום OC `#e11d2e` למותג/CTA
- רקע אטמוספרי (גרדיאנט כחול→חמים→ורוד עדין) במקום canvas שטוח
- Capsule CTAs / tab bar זכוכית במובייל; badges צבעוניים ל־SLA/עדיפות
- נשמר: RTL · צבע = אות תפעולי · לא סגול־גנרי · לא ticketing דקורטיבי  

---

## למה עכשיו

המערכת הנוכחית מרגישה כמו אוסף מסכי אדמין — לא מרכז שליטה תפעולי.  
קיים כבר:

| נכס | מצב | תפקיד בתוכנית |
|-----|-----|----------------|
| `DESIGN_SYSTEM.md` + `globals.css` | טוקנים בקוד | בסיס ל־Variables ב־Figma (או עדכון אם משנים כיוון) |
| `UX_IMPROVEMENT_PLAN.md` | עקרונות Ops | סדר מסכים + שאלות “מה קורה / מה דורש / מה הבא” |
| `docs/ux-preview/` (HTML) | Preview זמני | Reference בלבד — לא מקור אמת אחרי Figma |
| Penpot | לא מחובר לסוכן | ננטש לטובת Figma |

**החלטה:** Figma הוא מקור האמת לעיצוב עד אישור; הקוד מתעדכן רק אחרי מסגרות מאושרות.

---

## שער החלטה ויזואלי (חובה לפני מסך 1)

בלי כיוון ויזואלי מאושר — לא בונים 20 מסכים שייזרקו.

### שלוש שאלות שצריך לענות עליהן

1. **מה לא עובד היום?** (עומס כרטיסים / צבעים / צפיפות / “נראה כמו SaaS גנרי” / מובייל חלש / אחר)
2. **איזה כיוון רוצים?** בחרו אחד (או שילוב מפורש):

| כיוון | תחושה | מתאים ל־MILO? |
|-------|--------|---------------------|
| **A — Operational Quiet (נוכחי משופר)** | לבן חם, צפיפות Linear-like, אדום OC לפעולה בלבד | כן — כבר מתועד ב־`DESIGN_SYSTEM.md` |
| **B — Command Center** | Sidebar כהה / משטח כהה ל־Ops, תוכן בהיר, דגש על חריגים | כן — אם נשמרים אותות תפעוליים ולא “dark mode דקורטיבי” |
| **C — Retail Ops Soft** | יותר אוויר, טיפוגרפיה חזקה יותר, פחות טבלאות צפופות | חלקי — טוב ל־Store/Login; Ops עלול לאבד צפיפות |

3. **מה נשאר קדוש?** (המלצה קנונית)
   - צבע = אות תפעולי (critical / warning / progress / resolved), לא קישוט
   - אדום tenant (`#d92621`) = פעולה ראשית + מותג בלבד
   - RTL + עברית בכל המסכים
   - כל מסך עונה: מה קורה עכשיו · מה דורש טיפול · מה הפעולה הבאה
   - אין כרטיסי KPI בלי קישור לתור / פעולה

**פלט שער ההחלטה:** מסמך קצר “Visual North Star” (½ עמוד) + 1–2 moodboards ב־Figma לפני Components.

---

## מבנה קובץ Figma

קובץ אחד: **`MILO Design`** (Design file, לא FigJam).

| Page | תוכן |
|------|------|
| `00 · Cover` | שם מוצר, גרסת עיצוב, לינק לריפו / PR |
| `01 · Foundations` | Color / Type / Spacing / Radius / Elevation / Motion / Signal language |
| `02 · Components` | Button, Input, Badge/Signal, Table row, Nav, Sheet, Dialog, Empty/Error |
| `03 · Ops · Desktop` | 1280×800 (או 1440) — HQ |
| `04 · Ops · Mobile` | 390×844 — אותם מסכי Ops קריטיים |
| `05 · Store` | פורטל סניף (מובייל-ראשון) |
| `06 · Tech` | PWA טכנאי |
| `07 · Auth & System` | Login, Status, empty/error shells |
| `08 · Archive` | ניסויים / moodboards שלא נכנסו לקו |

### שמות פריימים

`{Role}/{Screen}/{Breakpoint}`  
דוגמה: `Ops/Dashboard/Desktop`, `Tech/JobDetail/Mobile`.

---

## מלאי מסכים (P0 → P2)

### P0 — ליבת עבודה יומית (מתחילים כאן)

| # | מסך | Role | למה קודם |
|---|-----|------|----------|
| 1 | Login | Auth | רגע מותג יחיד |
| 2 | Dashboard | Ops | קונסולת פעולה — לא סטטיסטיקות |
| 3 | Tickets (queue) | Ops | מסך הכי בשימוש |
| 4 | Ticket Detail | Ops | פעולות + ציר זמן |
| 5 | WhatsApp Inbox | Ops | רשימה → שיחה |
| 6 | Store home + Report | Store | דיווח מהשטח |
| 7 | Tech home + Job | Tech | ביצוע בשטח |

### P1 — רשת וניהול

| # | מסך | Role |
|---|-----|------|
| 8 | Stores list + Store detail | Ops |
| 9 | Assets | Ops |
| 10 | Vendors | Ops |
| 11 | Activity | Ops |
| 12 | Reports | Ops |

### P2 — הגדרות ותשתיות

| # | מסך | Role |
|---|-----|------|
| 13 | Users | Ops |
| 14 | Settings (+ WhatsApp templates / country WA) | Ops |
| 15 | Status | Ops |
| 16 | Simulator / Print QR | Ops |
| 17 | Tasks / Lab (אם נשארים במוצר) | Ops |

**מחוץ להיקף:** תושבים, גבייה, נוכחות NFC, לוח שנה כליבה, marketplace טכנאים (ראו `DIFFERENTIATION.md` / `BINO_MERGE_PLAN.md`).

---

## פאזות עבודה

### פאזה 0 — Setup (לפני עיצוב מסכים)

1. לוודא הרשאת **עריכה** ב־Figma (כרגע חשבון הסוכן על seat מסוג View בצוות — ייתכן שצריך Full / Dev seat או קובץ אישי עם הרשאת edit).
2. ליצור קובץ `MILO Design` (או לספק URL לקובץ קיים).
3. לאשר **Visual North Star** (שער ההחלטה למעלה).
4. לייבא / להגדיר Variables מ־`globals.css` (או טוקנים חדשים אם משנים כיוון — ואז לעדכן גם `DESIGN_SYSTEM.md`).

**שער יציאה:** קובץ חי + Foundations מאושרים + כיוון ויזואלי חתום.

### פאזה 1 — Foundations + Components

- Color (substrate / signal / tenant)
- Typography (Heebo + סקאלה ברורה; לא Inter/Roboto)
- Spacing / radius / elevation
- רכיבים: Button · Input · Signal badges · Table/List row · Page header · Sidebar + Bottom nav · Dialog/Sheet · Empty/Loading/Error

**שער יציאה:** ספריית רכיבים שמישה — בלי hardcode hex במסכים.

### פאזה 2 — מסכי P0 ב־Figma

סדר מומלץ:

1. Login  
2. Ops Dashboard (Desktop + Mobile)  
3. Tickets + Ticket Detail  
4. Inbox  
5. Store  
6. Tech  

לכל מסך: Desktop ו־Mobile כש־Ops; Mobile-first ל־Store/Tech.

**שער יציאה:** סקירת בעלים על P0; שינויים בפריימים לפני קוד.

### פאזה 3 — Handoff לקוד

| שלב | פעולה |
|-----|--------|
| 3a | Code Connect לרכיבים קיימים (`src/components/ui/*`) |
| 3b | עדכון `globals.css` / `DESIGN_SYSTEM.md` אם הטוקנים השתנו |
| 3c | יישום מסך־אחר־מסך לפי סדר P0 (לא “polish מקביל” בכל האפליקציה) |
| 3d | QA: RTL · מובייל · מצבי ריק/שגיאה · visual pack |

**כלל:** לא ליישם מסך בקוד לפני שהפריים ב־Figma אושר.

### פאזה 4 — P1 / P2

אותו מחזור: Figma → אישור → קוד.  
דוחות ו־Dashboard חייבים לחזק לפחות אחד מ: **שורש · עלות · מניעה**.

---

## זרימת עבודה עם הסוכן (Cursor + Figma MCP)

```
אישור כיוון → create/open file
     → Foundations (variables)
     → Components (design system)
     → Screen frames (use_figma + search_design_system)
     → סקירה שלך ב־Figma
     → Code Connect
     → PR יישום בקוד
```

| כלי | שימוש |
|-----|--------|
| `create_new_file` | קובץ Design חדש |
| `use_figma` | בניית foundations / components / screens |
| `search_design_system` | שימוש חוזר ברכיבים |
| `generate_figma_design` | צילום reference מהאפליקציה החיה (אופציונלי — “לפני”) |
| `get_design_context` / `get_screenshot` | קריאה חזרה לקוד אחרי אישור |
| Code Connect | מיפוי Figma ↔ React |

ה־HTML ב־`docs/ux-preview/` נשאר כ־archive / reference עד ש־P0 ב־Figma מחליף אותו.

---

## קריטריוני קבלה לכל מסך (Definition of Done)

- [ ] עונה על שלוש השאלות התפעוליות בשלוש השניות הראשונות
- [ ] משתמש רק ב־Variables / Components מהספרייה
- [ ] RTL מלא; מספרים ב־LTR / tabular
- [ ] Desktop + Mobile (או Mobile-only אם זה Store/Tech)
- [ ] מצבים: default · loading · empty · error (לפחות annotation)
- [ ] אין כרטיסים דקורטיביים בלי פעולה
- [ ] צבע signal רק למשמעות תפעולית
- [ ] תואם `DIFFERENTIATION.md` (לא ticketing גנרי / לא Bino building UI)

---

## סיכונים והערות

| סיכון | טיפול |
|-------|--------|
| Seat View בלבד — אין כתיבה לקובץ צוות | ליצור קובץ בבעלות אישית עם edit, או לשדרג seat |
| עיצוב בלי אישור כיוון → זריקה | שער Visual North Star חובה |
| סטייה מטוקני קוד | אחרי Figma — עדכון חד־כיווני ל־`DESIGN_SYSTEM.md` |
| “עוד דשבורד KPI” | נחסם ע״י UX_IMPROVEMENT_PLAN + DIFFERENTIATION |
| היקף מתנפח (P2 לפני P0) | סדר פאזות קשיח |

---

## מה צריך ממך עכשיו (כדי להתחיל פאזה 0)

1. **מה לא אוהב** במסכים הנוכחיים — במשפטים קצרים (או צילומי מסך).
2. **בחירת כיוון:** A / B / C (או תיאור חופשי).
3. **קובץ Figma:** ליצור חדש בשבילך, או לשלוח URL לקובץ קיים עם הרשאת עריכה.
4. **אישור היקף P0** מהטבלה למעלה (או שינוי סדר).

אחרי ארבע התשובות האלה — מתחילים Foundations ב־Figma בלי לגעת בקוד המוצר עד אישור מסכי P0.
