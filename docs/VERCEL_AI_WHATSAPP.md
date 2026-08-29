# Vercel AI SDK + AI Gateway — WhatsApp bot

**Status:** ממומש  
**Stack:** `ai` (Vercel AI SDK) · AI Gateway · `@ai-sdk/google` · `@ai-sdk/anthropic`  
**לא בשימוש:** OpenAI

---

## למה

MaintainOS רץ על Vercel, והבוט של WhatsApp כבר קורא ל־LLM.  
הכל עובר דרך **Vercel AI SDK** על פלטפורמות שאנחנו כבר עובדים איתן:

1. **AI Gateway** (מועדף בפרודקשן) — OIDC / `AI_GATEWAY_API_KEY`
2. **Gemini** — intake structured JSON
3. **Anthropic Claude** — ניסוח הודעות טבעיות במקום תבניות קבועות

## זרימת שיחה עם חנויות

```
WhatsApp (חנות)
  → webhook / demo
  → intake FSM (חנות → תיאור → תקלה)
  → WA_COPY templates כבסיס עובדתי
  → enhanceWhatsAppMessage (AI SDK) כשמופעל
  → createTicket + אישור בעברית
```

| מודול | תפקיד | מודל ברירת מחדל |
|-------|--------|------------------|
| `ai.ts` | מחליף תבניות בשיחה טבעית | `anthropic/claude-haiku-4.5` |
| `agent/provider.ts` | Intake structured JSON | `google/gemini-2.0-flash` |

בלי מפתחות — templates + rules בלבד (זהה להתנהגות הקודמת).

## הפעלה ב־Vercel

1. Dashboard → **AI Gateway** (enable)
2. `vercel env pull .env.local` או `AI_GATEWAY_API_KEY`
3. אופציונלי:

```env
WHATSAPP_AI_ENABLED=true
WHATSAPP_AI_INTAKE_ENABLED=true
```

## Bamakor

ראה [`BAMAKOR_AI_WHATSAPP_COMPAT.md`](./BAMAKOR_AI_WHATSAPP_COMPAT.md) — אותו pattern כבר קיים ב־`lib/whatsapp-ai.ts` של Bamakor (Anthropic ישיר); ניתן להחליף באותו AI SDK.
