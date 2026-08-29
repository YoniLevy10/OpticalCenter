# Bamakor ↔ MaintainOS — Vercel AI Gateway בלבד

**מסקנה:** כן — להחליף את `lib/whatsapp-ai.ts` ב־Bamakor ב־`generateText` דרך **Vercel AI Gateway בלבד** (בלי Anthropic/OpenAI/Google SDKs ישירים).

## Bamakor היום

`lib/whatsapp-ai.ts` קורא ל־`@anthropic-ai/sdk` ישירות עם `ANTHROPIC_API_KEY`.

## יעד משותף

| | Optical Center | Bamakor |
|--|----------------|---------|
| LLM | `ai` + AI Gateway | אותו דבר |
| Auth | `AI_GATEWAY_API_KEY` / OIDC | אותו דבר |
| תבניות free-text | `WA_COPY` → rewrite | `RESIDENT_UI_COPY` → rewrite |
| Meta Utility templates | נשאר Meta | נשאר Meta |

אין מפתחות ספק ב־env של האפליקציה — רק Gateway של Vercel.
