# Security checklist — MaintainOS

## Secrets exposed in chat (must rotate)
- [ ] Revoke any GitHub PAT (`ghp_…`) that was pasted for Bamakor read access
- [ ] Rotate Supabase `service_role` / `anon` keys if they were shared in chat
- [ ] Rotate Supabase database password if shared in chat
- [ ] Never commit `.env.local`

## Runtime
- Service role key only on server (webhook, cron, admin APIs)
- Verify Meta `X-Hub-Signature-256` in production (`WHATSAPP_APP_SECRET`)
- Prefer RLS for browser clients; webhook uses service role intentionally

## Messaging cost policy
See `docs/MESSAGING_COST_POLICY.md` — inbound-first WhatsApp; no paid status spam.
