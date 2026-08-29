# Bamakor ↔ MaintainOS — AI WhatsApp template replacement

**שאלה:** האם אותה שכבת Vercel AI SDK יכולה להחליף תבניות קבועות בשיחות דיירים ב־Bamakor לפתיחת תקלות?  
**תשובה קצרה:** כן — drop-in כמעט זהה ל־`lib/whatsapp-ai.ts` שכבר קיים ב־Bamakor.

---

## מה כבר יש ב־Bamakor (נבדק בריפו הפרטי)

| קובץ | תפקיד |
|------|--------|
| `lib/whatsapp-ai.ts` | `generateAIWhatsAppResponse` — Anthropic Haiku משכתב תבנית → עברית טבעית |
| `lib/whatsapp-resident-copy.ts` | תבניות קבועות לדיירים (HE/FR/EN): בניין, הבהרה, אישור תקלה |
| `lib/whatsapp-templates.ts` | `interpolateWhatsAppTemplate` + תבניות Meta |
| `lib/whatsapp-webhook/*` | FSM דיירים (בניין → תיאור → תקלה) |
| `package.json` | Next על Vercel + `@anthropic-ai/sdk` — **בלי OpenAI** |

הקוד ב־Bamakor זהה ברוח ל־`src/modules/whatsapp/ai.ts` ב־OpticalCenter (הועבר במקור משם).

## מה מתאים להחלפה ב־AI

| סוג הודעה | מתאים ל־AI rewrite? | הערה |
|-----------|---------------------|------|
| Free-text בתוך חלון 24ש׳ Meta | **כן** | בדיוק כמו `enhanceWhatsAppMessage` |
| `RESIDENT_UI_COPY` (ask building, clarification, confirm) | **כן** | לשמור facts מהתבנית |
| Meta **Utility templates** מחוץ לחלון | **לא** | חייבים שם תבנית מאושר ב־Meta; AI לא מחליף את זה |

## מיפוי טכני

```
Bamakor today:
  template + vars → generateAIWhatsAppResponse (Anthropic SDK) → send text

MaintainOS / target Bamakor:
  template + vars → generateText (Vercel AI SDK / Gateway) → send text
```

החלפה מומלצת ב־Bamakor:

1. להוסיף `ai` + `@ai-sdk/anthropic` (או Gateway בלבד ב־Vercel)
2. להחליף את גוף `lib/whatsapp-ai.ts` באותו pattern כמו OpticalCenter
3. להשאיר `WHATSAPP_AI_ENABLED` + fallback לתבנית
4. **לא** להוסיף OpenAI

## הבדלי דומיין (לא חוסמים)

| | Optical Center | Bamakor |
|--|----------------|---------|
| מי מדווח | עובד חנות | דייר |
| זיהוי | קוד חנות / QR / NFC | בניין / כתובת / רשימה |
| שפה | עברית | HE / FR / EN |
| SoT | MaintainOS tickets | Bamakor tickets |

אותו מנגנון AI (rewrite + optional structured intake); ה־FSM וה־copy נשארים per-product.

## מסקנה

- **Optical Center:** כבר מחובר — תבניות חנות → שיחה + פתיחת תקלה (נבדק ב־tests).
- **Bamakor:** מוכן טכנית לאותה שכבה; שינוי נקודתי ב־`whatsapp-ai.ts` על Vercel/Anthropic הקיימים, בלי OpenAI.
