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
cp .env.example .env.local
npm install
npm run dev
```

בלי מיגרציות על Supabase האפליקציה נופלת אוטומטית ל־**memory backend** לדמו.

## סקריפט דמו (E2E)

1. `/ops/simulator` — שלחו `STORE_172` ואז `המזגן הראשי לא עובד`
2. `/ops/tickets` — פתחו את התקלה, שייכו טכנאי
3. או לחצו **תקלת הדגמה לטכנאי** (יוצר + משייך)
4. `/tech` — התחילו טיפול → סיום עם הערה

API מהיר:

```bash
curl -X POST localhost:3000/api/demo/whatsapp \
  -H 'content-type: application/json' \
  -d '{"wa_id":"972501111111","text":"STORE_172"}'

curl -X POST localhost:3000/api/demo/whatsapp \
  -H 'content-type: application/json' \
  -d '{"wa_id":"972501111111","text":"המזגן הראשי לא עובד"}'

curl 'localhost:3000/api/demo/seed-ticket?assign=1'
```

## Supabase

מיגרציות ב־`supabase/migrations/`.

```bash
# דורש סיסמת DB מ־Supabase Dashboard → Database settings
SUPABASE_DB_PASSWORD=... node scripts/apply-migrations.mjs
```

או להריץ את קבצי ה־SQL ב־SQL Editor לפי סדר השם.

אופציונלי לכפות זיכרון גם כשיש DB:

```bash
MAINTAINOS_FORCE_MEMORY=1
```

## מסמכים

- [`docs/OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md`](docs/OPTICAL_CENTER_ARCHITECTURE_RESEARCH.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/MESSAGING_COST_POLICY.md`](docs/MESSAGING_COST_POLICY.md)
- [`docs/VERCEL_AI_WHATSAPP.md`](docs/VERCEL_AI_WHATSAPP.md) — Vercel AI SDK + AI Gateway לבוט WhatsApp
- [`docs/BAMAKOR_AI_WHATSAPP_COMPAT.md`](docs/BAMAKOR_AI_WHATSAPP_COMPAT.md) — התאמה ל־Bamakor (דיירים)
- [`docs/WHATSAPP_AI_INTAKE_PLAN.md`](docs/WHATSAPP_AI_INTAKE_PLAN.md)

## סקריפט דמו

ראה גם `scripts/e2e-demo.mjs` ו־`npm test` (כולל demo-flow).
