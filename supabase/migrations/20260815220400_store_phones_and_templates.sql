-- Plan gaps: store phone identity + WhatsApp templates catalog

create table if not exists public.store_phones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  wa_id text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  is_primary boolean not null default false,
  label text,
  created_at timestamptz not null default now(),
  unique (store_id, wa_id)
);

create index if not exists store_phones_wa_id_idx on public.store_phones (wa_id);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete cascade,
  key text not null,
  language text not null default 'he',
  meta_name text,
  body text not null,
  category text not null default 'utility',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, key, language)
);

alter table public.store_phones enable row level security;
alter table public.whatsapp_templates enable row level security;

-- Seed IL utility templates (for outside-24h later; not sent by default in pilot)
insert into public.whatsapp_templates (organization_id, country_id, key, language, body, category)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'ticket_received',
    'he',
    'הדיווח התקבל ✓ מספר תקלה: {{ticket_number}}. הצוות קיבל את הדיווח.',
    'utility'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'ticket_resolved',
    'he',
    'התקלה {{ticket_number}} נסגרה. תודה על הדיווח.',
    'utility'
  )
on conflict (organization_id, key, language) do nothing;
