-- Demo internal maintenance technicians for Israel pilot /tech portal
-- IDs match DEMO_TECH_ID used by the app memory/demo seed helpers.

insert into public.profiles (id, full_name, email, phone, locale)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'יוסי כהן',
    'yossi.cohen@optical-center.demo',
    '+972501000001',
    'he'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'מיכל לוי',
    'michal.levy@optical-center.demo',
    '+972501000002',
    'he'
  )
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  locale = excluded.locale;

insert into public.memberships (profile_id, organization_id, country_id, role)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'internal_technician'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'internal_technician'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'global_maintenance'
  );
