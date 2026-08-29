# Vercel AI SDK + AI Gateway — WhatsApp bot

**Status:** ממומש (מיגרציה מ־Anthropic SDK / fetch ישיר)  
**Stack:** `ai` (Vercel AI SDK) · AI Gateway · `@ai-sdk/google|openai|anthropic` fallback

---

## למה

MaintainOS רץ על Vercel, והבוט של WhatsApp כבר קורא ל־LLM.  
במקום מפתחות ספק ישירים + SDK שונים, הכל עובר דרך **Vercel AI SDK**:

1. **AI Gateway** (מועדף בפרודקשן) — OIDC / `AI_GATEWAY_API_KEY`, routing, עלות, failover
2. **Fallback מקומי** — אותם מפתחות `GOOGLE_*` / `OPENAI_*` / `ANTHROPIC_*` דרך `@ai-sdk/*`

ה־FSM של WhatsApp (webhook → intake → createTicket) **לא משתנה** — רק שכבת ה־LLM.

## שני שימושים

| מודול | תפקיד | מודל ברירת מחדל |
|-------|--------|------------------|
| `ai.ts` | ניסוח הודעות אישור/מחזור חיים | `anthropic/claude-haiku-4.5` |
| `agent/provider.ts` | Intake structured JSON | `google/gemini-2.0-flash` |

## הפעלה ב־Vercel

1. Dashboard → Project → **AI Gateway** (enable)
2. `vercel env pull .env.local` — מקבל `VERCEL_OIDC_TOKEN`
   או הגדר `AI_GATEWAY_API_KEY`
3. אופציונלי:

```env
WHATSAPP_AI_ENABLED=true
WHATSAPP_AI_INTAKE_ENABLED=true
# WHATSAPP_AI_INTAKE_MODEL=google/gemini-2.0-flash
# WHATSAPP_AI_MODEL=anthropic/claude-haiku-4.5
```

בלי Gateway / מפתחות — התנהגות זהה: templates + rules engine בלבד.

## קבצים

| קובץ | תפקיד |
|------|--------|
| `src/modules/whatsapp/ai-sdk/models.ts` | בחירת gateway / provider |
| `src/modules/whatsapp/ai.ts` | `generateText` לניסוח |
| `src/modules/whatsapp/agent/provider.ts` | `generateText` + `Output.object` |

## עתיד (אופציונלי)

[Chat SDK](https://chat-sdk.dev) + `@chat-adapter/whatsapp` יכולים לאחד webhook/adapters בין פלטפורמות.  
לא נדרש לפיילוט Optical Center — הערוץ היחיד כרגע הוא WhatsApp Cloud API.
