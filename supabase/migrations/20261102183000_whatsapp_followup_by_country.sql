-- Seed the session-reopen template against the live IL country,
-- not the hardcoded demo organization UUID.
-- Body/meta_name must match the approved template in Meta Business Manager.
-- See docs/META_WHATSAPP_TEMPLATE_FOLLOWUP.md

insert into public.whatsapp_templates (
  organization_id,
  country_id,
  key,
  language,
  meta_name,
  body,
  category,
  is_active
)
select
  c.organization_id,
  c.id,
  'session_followup',
  'he',
  'maintainos_followup',
  E'שלום, צוות התחזוקה של Optical Center כאן.\nיש לנו עדכון לגבי דיווח שפתחתם.\nנא להשיב להודעה זו כדי שנמשיך את השיחה.',
  'utility',
  true
from public.countries c
where upper(c.code) = 'IL'
on conflict (organization_id, key, language) do update
set
  meta_name = excluded.meta_name,
  body = excluded.body,
  category = excluded.category,
  country_id = excluded.country_id,
  is_active = true;

-- Catalog only. Stays inactive until Meta approves maintainos_desk_alert.
insert into public.whatsapp_templates (
  organization_id,
  country_id,
  key,
  language,
  meta_name,
  body,
  category,
  is_active
)
select
  c.organization_id,
  c.id,
  'desk_alert',
  'he',
  'maintainos_desk_alert',
  E'יש פריט שמחכה להחלטה: {{1}}\nפתחו את מסך האישורים במערכת.',
  'utility',
  false
from public.countries c
where upper(c.code) = 'IL'
on conflict (organization_id, key, language) do update
set
  meta_name = excluded.meta_name,
  body = excluded.body,
  category = excluded.category,
  country_id = excluded.country_id;
