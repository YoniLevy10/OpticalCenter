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
2. Set the same env vars for **Production** + **Preview**
3. Production URL (team): `https://optical-center-yonilevy10s-projects.vercel.app`
4. Disable **Deployment Protection / Vercel Authentication** if you need a public demo without SSO
5. Do **not** use `optical-center.vercel.app` (unrelated site) or dead `optical-center-rose` aliases

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
