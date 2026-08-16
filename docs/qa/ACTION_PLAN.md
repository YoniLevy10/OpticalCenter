# MaintainOS — תוכנית פעולה מקצה לקצה

**תאריך:** 2026-08-16  
**ענף עבודה:** `stabilize` (מ־`main`)  
**מיזוג:** ניתוח פערי backend/features (סקירת קוד) + [Development Board & UI Stability Assessment](./DEVELOPMENT_BOARD_AND_UI_STABILITY_ASSESSMENT.md)  
**מטרה:** רשימת פעולות אחת, מסודרת בפאזות, עם הערכת מאמץ, להביא את האפליקציה ל־production אמיתי.

---

## עקרונות מנחים

1. **הקפאת פיצ'רים עד סיום פאזה 1–3** — לא מוסיפים מסכים חדשים עד שה־UI הקיים יציב
2. **כל שינוי מסך חייב:** פרימיטיב קיים או Storybook story חדש → screenshot pack ירוק → מחיקת orphans
3. **האימות האמיתי הוא טלפון** — אם זה נשבר ב־iPhone, זה לא מוזג
4. **Backend מלווה UI** — כל פאזת backend נבדקת גם מה־UI ולא רק מ־curl

---

## החלטות מקובעות לפיילוט ישראל

| נושא | בחירה |
|------|--------|
| Auth | **Magic Link בלבד** בפאזה 4. Google OAuth נדחה לפאזה 8 / לפי דרישה מפורשת |
| התראות טכנאי | **WhatsApp עם לינק לטיקט** (לא Web Push בשלב זה) |
| Tablet | **אין חוזה נפרד** — נשארים עם `md` עד שיש משתמשי tablet אמיתיים |
| Chromatic | **לא** בפאזות 1–7; רק אם Storybook נשמר לאורך זמן |

---

## סטטוס נוכחי — סיכום

| תחום | סטטוס | הערה |
|------|--------|------|
| WhatsApp intake (טקסט) | 🟡 עובד בדמו | מדיה חסרה ב־production |
| יצירת תקלה | ✅ | memory + supabase |
| Ops inbox / queue | 🟡 | SLA fields חסרים ב־Supabase query |
| Ticket detail | 🟡 | timeline broken, actions לא sticky |
| Tech portal | 🟡 | עובד בדמו, `?techId=` ל־SSR |
| Auth | 🟡 | Magic link חלקי, אין callback/logout/page gate |
| RLS | ✅ migration | אבל SSR עדיין service-role |
| PWA | 🟡 | manifests חיים, PwaLifecycle מת |
| התראות לחנות | ⚪ | sendWhatsAppText קיים אבל לא מחובר ל־lifecycle |
| התראות לטכנאי | ⚪ | realtime רק כשהפורטל פתוח |
| ניהול משתמשים | ⚪ | seed data בלבד |
| Dashboard / KPIs | ⚪ | |
| SLA escalation | ⚪ | timestamps מחושבים, אין action |
| QR/NFC generation | ⚪ | |
| CI/CD | ⚪ | tests קיימים, אין GitHub Actions |
| Error monitoring | ⚪ | console.log בלבד |

**מקרא:** ✅ Done · 🟡 Partial · ⚪ Missing

---

## פאזה 0 — הקפאה והכנה (0 ימים)

- [x] **הקפאת פיצ'רים** — אין redesign, אין מסכים חדשים עד פאזה 3
- [x] יצירת branch `stabilize` מ־`main`
- [x] תיעוד התוכנית במסמך זה (`docs/qa/ACTION_PLAN.md`)
- [ ] תיעוד הסכמה ב־PR: כל PR חייב עבור visual regression לפני merge (נאכף החל מפאזה 2)

---

## פאזה 1 — ניקוי ותיקוני P0 פונקציונליים (1–2 ימים)

### 1.1 תיקוני P0 — שבור וגלוי

- [ ] **Timeline לא מציג status transitions** — writers מ־emit `{from, to}`, readers מצפים `from_status`/`to_status`. תיקון payload alignment בין `src/modules/tickets/activity.ts` ל־`timeline.tsx` (תמיכה בשני הפורמטים)
- [ ] **Tech "החנות" → empty `tel:`** — כפתור נראה אמיתי אבל לא מחייג. או למלא מ־DB או להסתיר כשאין מספר (`src/app/tech/[ticketId]/page.tsx`)
- [ ] **`PwaLifecycle` מת** — משתמש בטוקנים שלא קיימים. **ברירת מחדל בפאזה 1: מחיקה** אם לא מחובר; שחזור מאוחר יותר רק עם טוקני OQ

### 1.2 ניקוי Orphans

- [ ] מחיקת `IssuesMobileList`, `IssuesFilterBar`, `StoresMobileList` — הוחלפו ב־OQ primitives
- [ ] סנכרון `DESIGN_SYSTEM.md` עם exports אמיתיים (למחוק רפרנסים ל־Drawer, PriorityEdge וכו' שלא קיימים)
- [ ] מחיקת חבילות Radix לא משומשות מ־`package.json` (tabs, dropdown-menu, tooltip)
- [ ] איחוד אסטרטגיית RTL chevron (3 אסטרטגיות שונות כרגע)

### 1.3 תיקוני P1 — UX גרוע

- [ ] HQ ticket actions **sticky ב־mobile** — כרגע מתחת ל־chronology
- [ ] תיקון tap targets מתחת 44px ב־filter chips / segmented controls
- [ ] Toast offset — לא מתחשב ב־desktop (מתקזז תמיד ל־bottom nav)

**קריטריון סיום:** P0 כל הנקודות תוקנו, אין orphan components, `npm test` ירוק.

---

## פאזה 2 — Visual Gate / QA Infrastructure (1–2 ימים)

### 2.1 Hardening Playwright

- [ ] הורדת `maxDiffPixelRatio` מ־0.18 → **0.03**
- [ ] הוספת 5 viewports: 390 / 430 / 768 / 1024 / 1440
- [ ] 5 critical routes: `/ops/tickets`, `/ops/tickets/[id]`, `/tech`, `/tech/[id]`, `/login`
- [ ] Mask של clocks / live SLA ב־screenshots (אזורים דינמיים)
- [ ] הרחבת `@axe-core/playwright` ל־ticket detail + tech

### 2.2 CI GitHub Actions

- [ ] Workflow: `on: push to main + PR` → `npm ci` → lint → typecheck → `npm test` (vitest) → `npx playwright test`
- [ ] Upload playwright report as artifact
- [ ] **Block merge אם tests נכשלים**
- [ ] Vercel deploy אוטומטי כבר קיים — לוודא ש־production deploy תלוי ב־green CI

**קריטריון סיום:** CI רץ על כל PR, screenshots נבדקים ב־5 viewports, אי אפשר למזג עם UI שבור.

---

## פאזה 3 — Storybook Mini (2–3 ימים)

- [x] התקנת Storybook מינימלי (`storybook` + `build-storybook`, RTL ב־preview, `globals.css`)
- [x] Stories לפרימיטיבים קריטיים:
  - Button (כל variants + sizes)
  - Input / Search
  - OperationalRow (empty / loading / error / critical / RTL)
  - Table
  - Toast (עם `ToastProvider`; בלי provider = no-op)
  - Signal / SLA / Status / Priority labels
  - BottomSheet / Modal
  - PageHeader / EmptyState / ErrorState (+ loading skeletons)
- [x] כל story: states ריק / loading / error / critical + RTL (ברירת מחדל ב־preview)
- [x] **כלל ברזל:** No screen PR without Storybook story for changed primitives.

**קריטריון סיום:** 8–12 stories, כל פרימיטיב מבודד ויציב, הבסיס לכל שינוי UI עתידי.

---

## פאזה 4 — Auth Productize (3–5 ימים)

> **לא מתחילים לפני פאזה 1–3.** Auth על UI לא יציב = עוד סבב שברים.

### 4.1 Magic Link completion (חובה)

- [ ] **`/auth/callback` route** — `exchangeCodeForSession` + redirect ל־role home
- [ ] **Page gate** — `/ops/*` ו־`/tech/*` מפנים ל־`/login` אם אין session (ב־layout או middleware)
- [ ] **Logout** — כפתור `signOut` + ניקוי cookie + redirect ל־`/login`
- [ ] **Session refresh middleware** — חידוש SSR session cookies
- [ ] **Role redirect post-login** — HQ → `/ops/tickets`, Tech → `/tech`
- [ ] הסרת "pilot direct entry" link מ־`/login` ב־production (רק כש־`FORCE_MEMORY=1` / `ALLOW_TEST_AUTH=1`)

### 4.2 Google OAuth

> **נדחה לפיילוט.** רק אם מוצר דורש במפורש — ראה פאזה 8.

### 4.3 ניהול משתמשים — בסיס (חובה ל־pilot אמיתי)

- [ ] **Admin UI להוספת טכנאים** — טופס: שם, אימייל, תפקיד, הרשאות (country/region/store)
- [ ] יצירת profile + membership דרך UI (לא רק seed)
- [ ] רשימת משתמשים עם הרשאות ואפשרות עריכה
- [ ] הגבלת גישה ל־`global_admin` / `global_maintenance` בלבד

**קריטריון סיום:** login אמיתי עובד, אי אפשר להגיע ל־`/ops` בלי session, logout עובד, ניתן להוסיף טכנאי דרך UI.

---

## פאזה 5 — Backend Feature Completeness (4–6 ימים)

> אלו הפיצ'רים שבלעדיהם הפיילוט לא עובד אמיתי.

### 5.1 WhatsApp Inbound Media (1.5–2 ימים)

- [ ] Webhook: זיהוי `image` / `document` / `audio` ב־inbound message
- [ ] קריאת Graph API: `GET /{media_id}` → download binary
- [ ] העלאה ל־Supabase Storage → public URL
- [ ] שמירה ב־`ticket_messages.media_url` ו/או `ticket_attachments`
- [ ] תצוגה ב־Ticket Detail evidence gallery (כבר קיים `mergeEvidence` — צריך נתונים אמיתיים)
- [ ] Fallback: אם הורדה נכשלת, שמירת רפרנס + log + הודעה לחנות שהתמונה לא התקבלה
- [ ] E2E test: שליחת תמונה דרך simulator → תקלה עם evidence

### 5.2 התראות לחנות — Lifecycle Notifications (1–1.5 ימים)

- [ ] Hook ל־`updateStatus` / `assign`: שליחת WhatsApp חזרה ל־reporter
- [ ] Templates (Hebrew):
  - `assigned`: "טכנאי הוקצה לתקלה בחנות {store}. שם הטכנאי: {name}"
  - `in_progress`: "הטכנאי התחיל טיפול בתקלה"
  - `waiting_parts`: "ממתינים לחלקים — עדכון יישלח"
  - `resolved`: "התקלה טופלה. תודה!"
  - `closed`: "התקלה נסגרה"
- [ ] כיבוד cost-policy (לא שולחים ספאם)
- [ ] Persist ב־`ticket_messages` (direction: outbound)
- [ ] Memory backend: הודעות נשמרות גם ב־memory לדמו

### 5.3 התראות לטכנאי (1 יום)

> **בחירת פיילוט: WhatsApp עם לינק לטיקט** (לא Web Push בשלב זה).

- [ ] בעת `assign`: WhatsApp לטכנאי עם לינק ל־`/tech/{ticketId}`
- [ ] Persist outbound + cost-policy
- [ ] Fallback טקסט אם אין מספר לטכנאי
- [ ] (נדחה) Web Push / VAPID — לפאזה 8 אם יידרש

### 5.4 SLA Escalation (1 יום)

- [ ] **Cron job** (Supabase scheduled function או Vercel cron): כל 5 דקות
  - מחפש tickets שעברו `sla_respond_by` ועדיין ב־`new`/`triaged`
  - מחפש tickets שעברו `sla_resolve_by` ועדיין לא `resolved`
  - פעולות: bump priority + notify manager + סימון ויזואלי
- [ ] **Visual alert** ב־inbox: tickets ב־breach עם אינדיקציה ברורה (רקע אדום, פעמון)
- [ ] Dashboard widget: "X tickets ב־breach" (או strip ב־inbox עד שיש dashboard)
- [ ] Memory backend: mock escalation לדמו

### 5.5 תיקון SLA ב־Supabase query (0.5 יום)

- [ ] `listTickets` — הוספת `sla_respond_by`, `sla_resolve_by`, `first_response_at`, `resolved_at` ל־select
- [ ] בדיקה ש־queue view מציג SLA נכון ב־Supabase (כרגע רק memory)

**קריטריון סיום:** חנות שולחת תמונה → תקלה עם evidence → טכנאי מקבל התראה → פותר → חנות מקבלת עדכון. SLA breach מטפל עצמאית.

---

## פאזה 6 — SSR / RLS in Pages (2–3 ימים)

- [x] החלפת `createSystemClient` / `createAdminClient` ב־`createUserClient` ב־HQ pages
  - _(phase 6 pilot: keep listTickets/getById memory/system; enforce `filterTicketsForActor` / `canReadTicket` after fetch; `createUserClient` preferred when `authVia === supabase_session` next)_
- [x] אותו דבר ב־Tech pages — session-only tech (במקום `?techId=`)
  - _`getServerActor()` + `resolveServerTechId`; query `techId` רק ב־demo כשאין tech actor_
- [x] וידוא ש־RLS policies עובדות עם user client (לא service-role)
  - _defense-in-depth app filter; user-client reads deferred while memory pilot remains default_
- [x] הסרת `?techId=` כ־SSR mechanism — רק session
  - _production path session-only; demo/E2E may still pass query while cookie catches up_
- [x] בדיקות: IDOR tests עוברים עם user client
  - _unit scope helpers + existing API IDOR / Playwright under FORCE_MEMORY_
- [x] Memory backend: fallback נשאר כמו שהוא

**קריטריון סיום:** כל קריאת DB משתמש ב־user session, RLS אוכף, `?techId=` לא נחוץ.
_(pilot note: memory/system fetch + actor scope filter; full user-client swap when Supabase session is the default path)_

---

## פאזה 7 — Operational Features (3–4 ימים)

### 7.1 Dashboard / KPIs (1.5 ימים)

- [ ] `/ops/dashboard` — מסך נחיתה ל־HQ אחרי login
- [ ] Widgets:
  - תקלות פתוחות (counter + trend)
  - SLA breaches (counter + list)
  - זמן פתרון ממוצע
  - תקלות לפי קטגוריה (bar/pie)
  - עומס טכנאים (tickets per tech)
  - תקלות לפי חנות (top 5)
- [ ] עדכון ידני / auto-refresh (לא realtime בשלב ראשון)
- [ ] Mobile-friendly (cards במקום טבלאות)

### 7.2 QR/NFC Generation Tool (1 יום)

- [ ] `/ops/stores/[id]` — עמוד חנות עם QR generation
- [ ] יצירת QR code עם wa.me link + קוד חנות
  - ספריה: `qrcode` או client-side canvas
- [ ] הורדת PDF עם QR להדפסה (sticker format)
- [ ] הנחיות NFC: כתיבת NDEF record עם אותו URL
- [ ] Batch generation: כל החנויות במדינה → PDF אחד

### 7.3 Store/Asset CRUD (1 יום)

- [ ] `/ops/stores` — הוספת/עריכת חנות (כרגע read-only)
- [ ] `/ops/stores/[id]` — ניהול assets (מזגן, תאורה, דלת...)
- [ ] הוספת/השבתת חנות
- [ ] רק `global_admin` / `country_manager` יכול לערוך

### 7.4 Error Monitoring (0.5 יום)

- [ ] התקנת Sentry (`@sentry/nextjs`)
- [ ] Capture: webhook errors, API errors, client errors
- [ ] Alerting: webhook failures → email/Slack
- [ ] Rate limiting: `@upstash/ratelimit` על webhook endpoint

**קריטריון סיום:** Ops manager יש מסך נחיתה עם KPIs, יכול לייצר QR לחנויות, יכול לנהל חנויות/assets, שגיאות נקלטות.

---

## פאזה 8 — Scale & Polish (לטווח ארוך, לפי צורך)

| פריט | מאמץ | מתי |
|------|------|-----|
| **Google OAuth** | 2–3 ימים | רק אם מוצר דורש במפורש |
| **Web Push לטכנאי** | 1–2 ימים | אם WhatsApp לא מספיק בשטח |
| **i18n** — הוספת שפות (צרפתית כבר ב־schema) | 3–5 ימים | לפני חנות ראשונה בצרפת |
| **Reopen tickets** — מצב סגור לא סופי | 1 יום | לפי בקשת ops |
| **Email notifications** — SLA breach, unassigned timeout | 2 ימים | כשיש מנהל שלא פותח WhatsApp |
| **Chromatic** — visual regression בענן | 1 יום | רק אם Storybook נשאר |
| **Tablet contract** — mobile/tablet/desktop | 2 ימים | כשיש משתמשי tablet אמיתיים |
| **Audit log** — מי עשה מה, מתי | 2 ימים | ל־enterprise / compliance |
| **Rate limiting** — נוסף על webhook | 0.5 יום | לפני traffic גבוה |
| **Backup strategy** — Supabase backups | 0.5 יום | כשיש data אמיתי |

---

## ציר זמן כולל

| פאזה | תוכן | ימים | מצטבר |
|------|------|------|-------|
| 0 | הקפאה והכנה | 0 | 0 |
| 1 | ניקוי + P0 פונקציונלי | 1–2 | 1–2 |
| 2 | Visual gate + CI | 1–2 | 2–4 |
| 3 | Storybook mini | 2–3 | 4–7 |
| 4 | Auth productize + user mgmt | 3–5 | 7–12 |
| 5 | Backend features (media, notifications, SLA) | 4–6 | 11–18 |
| 6 | SSR / RLS in pages | 2–3 | 13–21 |
| 7 | Operational (dashboard, QR, CRUD, monitoring) | 3–4 | 16–25 |
| 8 | Scale & polish | לפי צורך | — |

**אומדן לפיילוט ישראל production-ready: ~16–25 ימי עבודה**

---

## סדר חובה

```
פאזה 1 → 2 → 3   (לא מתחילים כלום לפני ייצוב UI)
         ↓
פאזה 4            (auth על UI יציב)
         ↓
פאזה 5 ←→ פאזה 6  (backend features + SSR — יכולים במקביל)
         ↓
פאזה 7            (operational — מעל תשתית יציבה)
         ↓
פאזה 8            (לפי צורך)
```

---

## נקודות החלטה — סטטוס

| שאלה | החלטה |
|------|--------|
| Google OAuth או Magic Link בלבד? | **Magic Link בלבד** לפיילוט; Google בפאזה 8 אם יידרש |
| התראות טכנאי: Web Push או WhatsApp? | **WhatsApp עם לינק** לפיילוט; Push בפאזה 8 אם יידרש |
| Tablet נפרד? | **לא עכשיו** |
| Chromatic? | **לא בפאזות 1–7** |

---

## קישורים

- [Development Board & UI Stability Assessment](./DEVELOPMENT_BOARD_AND_UI_STABILITY_ASSESSMENT.md)
- [P0 Fix Report](./P0_FIX_REPORT.md)
- [Pilot QA Report](./PILOT_QA_REPORT.md)
- [Design System](../DESIGN_SYSTEM.md)

---

*מסמך זה ממזג את ניתוח פערי ה־backend עם Development Board & UI Stability Assessment. כל פריט מסומן ב־checkbox למעקב.*

**ביצוע ראשון אחרי פאזה 0:** להתחיל **פאזה 1 בלבד** (לא לדלג ל־Auth/features).
