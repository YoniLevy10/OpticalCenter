# Deployment — MaintainOS / Optical Center

## Supabase
- Project: `pfsxuylbnpbcgjehuaqo`
- Apply SQL: `SUPABASE_DB_PASSWORD=… npm run db:migrate`
- Pooler host (IPv4): `aws-1-eu-west-1.pooler.supabase.com`

Required env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel
1. Project linked to `YoniLevy10/OpticalCenter`
2. **Root Directory** must be empty / repo root (not a subfolder)
3. Framework Preset: **Next.js**
4. Build Command: `next build` (do **not** use `--turbopack` in production)
5. Set env vars for Production + Preview (Supabase URL/anon/service_role, `NEXT_PUBLIC_APP_URL`)
6. Production domain: use the project Production URL from Vercel → Domains
7. Disable **Deployment Protection / Vercel Authentication** for public demos
8. Do **not** bookmark old `*-qag9…-*.vercel.app` deployment hashes — they expire / 404 when superseded
9. Do **not** use `optical-center.vercel.app` (unrelated site) or dead `optical-center-rose` aliases

After each merge to `main`, open:
Vercel → Project **optical-center** → **Deployments** → latest **Production** → **Visit**

## Meta WhatsApp (when ready)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- Webhook URL: `https://<host>/api/whatsapp/webhook`

## Local
```bash
cp .env.example .env.local
npm install
npm run dev
```
