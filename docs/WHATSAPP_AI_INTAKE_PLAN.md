# WhatsApp AI Intake Agent — Optical Center

**Status:** אושר וממומש  
**החלטות:** Vision = ארכיטקטורה+מדיה בלבד · AI = Gemini Flash חינמי, אחרת OpenAI

---

## החלטות שנקבעו

| נושא | החלטה |
|------|--------|
| Vision | ארכיטקטורה + שמירת מדיה בלבד; בלי ניתוח תמונה ב-MVP |
| AI provider | **Vercel AI SDK** — AI Gateway מועדף בפרודקשן; fallback: Gemini Flash → OpenAI |
| SoT | רק Supabase + `createTicket` הקיים; אין DB מקביל לבוט |
| עדיפויות | מיפוי UX `URGENT` → `critical` במערכת (`critical \| high \| medium \| low`) |

---

## מה כבר קיים (למחזר)

```
WhatsApp → Meta Cloud API → webhook → parse/signature/dedupe
  → intake FSM → createTicket → Supabase
  → sendWhatsAppText
```

**למחזר כמעט כמו שהוא:**
- `src/app/api/whatsapp/webhook/route.ts` — verify, HMAC, rate limit
- `parse.ts`, `signature.ts`, `send.ts`, `media.ts`
- Hybrid store: `store_phones` + `STORE_172` / QR / NFC ב-`intake.ts`
- `createTicket` + `ticket_messages` / `ticket_attachments`
- `classifyFaultText` כבסיס ל-Rules Engine
- Demo: `/api/demo/whatsapp` + simulator

**מה לא מספיק היום:**
- `ai.ts` רק משכתב תבניות תשובה — לא intake
- FSM: `awaiting_store → awaiting_description → done` בלי clarification
- `human_takeover` קיים ב-DB/UI אבל הבוט מתעלם ממנו
- Webhook מריץ עיבוד בסנכרון לפני 200

---

## ארכיטקטורה מומלצת

```
Meta webhook
  → Fast path: verify + parse + enqueue (after)
  → HTTP 200 מיידי
  → Worker: processInbound
       → dedupe by message_id
       → human_takeover? → log only
       → hybrid store resolve
       → AI Intake Agent (structured JSON)
       → Rules Engine (priority סופי)
       → clarification? (max 1–2)
       → duplicate open-ticket check
       → createTicket + media
       → confirmation WhatsApp
```

**עיקרון:** WhatsApp = interface של Optical Center, לא מערכת לצידה.

רפרנסים (רק patterns):
- Helban → fast ACK + idempotency + send retries
- Moked → process stages; אצלנו: Fault Intake → Classification → Clarification → Ticket Creation

---

## שינויי סכמה

מיגרציה חדשה:

1. **הרחבת `intake_sessions`**
   - `state`: הוספת `awaiting_clarification`
   - `clarification_count` (int, max 2)
   - `draft_payload` jsonb — תוצאת AI אחרונה לפני פתיחת תקלה
   - `active_ticket_id` uuid nullable
   - שימוש ב-`pending_description` שכבר קיים

2. **טבלה `whatsapp_messages`** (לוג שיחה ל-AI + audit; לא SoT של תקלות)
   - `country_id`, `wa_id`, `direction` (in/out), `body`, `meta_message_id` unique, `media_kind`, `ticket_id` nullable, `intake_session_id`, `created_at`
   - RLS: server/service role בלבד

3. **שדות על `tickets`**
   - `ai_summary` text nullable
   - `ai_raw` jsonb nullable
   - מקור נשאר `whatsapp` / `qr_whatsapp` / `nfc_whatsapp`

לא יוצרים SQLite / ticket store נפרד.

---

## מודולים חדשים / שינויים

| קובץ | תפקיד |
|------|--------|
| `src/modules/whatsapp/agent/schema.ts` | Zod schema ל-JSON של ה-agent |
| `src/modules/whatsapp/agent/provider.ts` | Vercel AI SDK (`generateText` + `Output.object`); Gateway → Gemini → OpenAI |
| `src/modules/whatsapp/ai-sdk/models.ts` | בחירת מודל (gateway / @ai-sdk providers) |
| `src/modules/whatsapp/agent/intake-agent.ts` | קריאה + validate + history context |
| `src/modules/whatsapp/agent/rules.ts` | Rules Engine — מרחיב/עוטף `classifyFaultText` |
| `src/modules/whatsapp/agent/duplicates.ts` | חיפוש תקלות פתוחות באותה חנות |
| `src/modules/whatsapp/intake.ts` | שילוב agent + clarification + takeover |
| `src/modules/whatsapp/send.ts` | retries + exponential backoff |
| `src/app/api/whatsapp/webhook/route.ts` | verify/parse → `after()` → 200 מיידי |
| `src/modules/whatsapp/ai.ts` | נשאר לניסוח אישור (אופציונלי); לא ה-brain |
| `.env.example` | מפתחות Gemini/OpenAI + `WHATSAPP_AI_INTAKE_ENABLED` |

### Structured output

```json
{
  "category": "hvac",
  "summary": "המזגן הראשי אינו מקרר וקיימת נזילת מים",
  "asset": "Main AC",
  "priority_suggestion": "high",
  "needs_clarification": false,
  "clarification_question": null,
  "possible_duplicate_hint": null
}
```

AI = suggestion בלבד. Rules Engine קובע priority סופי.

### Flow UX (MVP)

1. `STORE_172` → מזהה חנות (compat מלא עם QR/NFC).
2. `"המזגן הראשי לא עובד ויש ממנו נזילה"` → agent → `hvac` + summary; rules מעלים priority לפי נזילה.
3. Clarification רק אם באמת צריך (max 2 שאלות).
4. `createTicket` — מופיע מיד ב-Ops dashboard.
5. אישור קצר עם `#OC-…`.
6. שמירת `wa_id → store` ב-`store_phones` כשזה הגיוני.

### Media / Vision

- Meta → download → Supabase `ticket-media` נשאר.
- Hook מוכן ל-Vision בעתיד — **לא מיושם ב-MVP**.

### Reliability

- Signature + dedupe
- Webhook fast-path עם `after()`
- Send retries על 429/5xx
- `human_takeover` → בוט שותק
- `normalizeTicketCategory` על נתיב WA
- logging + Sentry אם מוגדר

### בדיקות

- Unit: schema, rules, dedupe, store parse
- הרחבת `intake-matrix.test.ts`
- E2E אחד: `STORE_172` → מזגן+נזילה → ticket

---

## בעיות / החלטות שכדאי שתדע

1. **חינמי ≠ פרודקשן יציב** — Gemini free tier מוגבל; בפרודקשן מומלץ מפתח בתשלום.
2. **אין queue חיצוני** ב-MVP (`after()` בלבד).
3. **Duplicate** = heuristic, לא LLM-only.
4. **Anthropic הקיים** נשאר ל-copy polish; ה-intake brain נפרד.
5. **Takeover לא מחובר** — יתוקן באותו שינוי.

---

## סדר מימוש

1. מיגרציה + types/states
2. Rules + schema + provider + agent
3. שילוב ב-`intake.ts` + takeover + store_phones
4. Webhook `after()` + send retries
5. Confirmation + demo/E2E + unit tests
6. Commit / PR

## מחוץ לסcope

- Chatbot כללי / CRM / דשבורד חדש
- Vision analysis
- Meta HSM templates מחוץ ל-24h
- Baileys
- העתקת Helban/Moked כקודbase

---

**כדי לאשר:** כתוב «אשר» / «go» / «תתחיל לממש» ואז אתחיל implementation.
