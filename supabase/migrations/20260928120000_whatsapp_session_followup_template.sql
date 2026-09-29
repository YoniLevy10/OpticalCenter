-- Seed Meta session-reopen utility template (outside 24h care window).
-- Body/meta_name must match the approved template in Meta Business Manager.
-- See docs/META_WHATSAPP_TEMPLATE_FOLLOWUP.md

insert into public.whatsapp_templates (
  organization_id,
  country_id,
  key,
  language,
  meta_name,
  body,
  category
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'session_followup',
    'he',
    'maintainos_followup',
    E'שלום, צוות התחזוקה של Optical Center כאן.\nיש לנו עדכון לגבי דיווח שפתחתם.\nנא להשיב להודעה זו כדי שנמשיך את השיחה.',
    'utility'
  )
on conflict (organization_id, key, language) do update
set
  meta_name = excluded.meta_name,
  body = excluded.body,
  category = excluded.category,
  is_active = true;
