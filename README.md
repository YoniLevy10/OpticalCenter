# MaintainOS

פלטפורמת דיווח וניהול תקלות לרשתות קמעונאיות.  
**Optical Center** = deployment ראשון (פיילוט ישראל).

## עקרונות פיילוט

- ערוץ דיווח: **WhatsApp**
- זיהוי חנות: **QR + NFC + קוד מספרי** (למשל `172`)
- מספר WhatsApp **לכל מדינה** (לא לכל חנות)
- שפה: **עברית**
- צוות תחזוקה פנימי של Optical Center
- מיתוג ניטרלי (MaintainOS)

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Vercel

## הרצה מקומית

```bash
cp .env.example .env.local   # אם צריך
npm install
npm run dev
```

## Supabase

מיגרציות ב־`supabase/migrations/`.

להחלה על הפרויקט (דורש DB password):

```bash
npx supabase db push --project-ref pfsxuylbnpbcgjehuaqo
```

או להריץ את קבצי ה־SQL ב־Supabase SQL Editor.

## מסמכים

- [`docs/OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md`](docs/OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md)
