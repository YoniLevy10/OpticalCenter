# Vercel AI Chatbot (Gateway) — WhatsApp

**Stack:** רק `ai` (Vercel AI SDK) + **AI Gateway**  
**לא בשימוש:** OpenAI · Anthropic SDK · Google SDK · מפתחות ספק ישירים

---

## מה זה

בוט WhatsApp של MaintainOS מדבר עם מודלים **רק דרך Vercel AI Gateway**.  
אין `@ai-sdk/anthropic`, אין `@ai-sdk/google`, אין `OPENAI_API_KEY`.

```
WhatsApp → intake FSM → WA_COPY (facts)
  → generateText(model: "provider/model")  // Gateway
  → createTicket
```

## הפעלה

1. Vercel Dashboard → Project → **AI Gateway** (enable)
2. `vercel env pull .env.local` **או** `AI_GATEWAY_API_KEY=...`
3. אופציונלי:

```env
WHATSAPP_AI_ENABLED=true
WHATSAPP_AI_INTAKE_ENABLED=true
# WHATSAPP_AI_MODEL=anthropic/claude-haiku-4.5
# WHATSAPP_AI_INTAKE_MODEL=google/gemini-2.0-flash
```

בלי Gateway — templates + rules בלבד.

## Bamakor

אותו עיקרון: להחליף `lib/whatsapp-ai.ts` ל־`generateText` דרך Gateway בלבד.  
ראה `docs/BAMAKOR_AI_WHATSAPP_COMPAT.md`.
