-- P0: membership-scoped RLS, hierarchy integrity, France fixture, known phone

-- ---------------------------------------------------------------------------
-- Hierarchy integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.enforce_ticket_hierarchy()
returns trigger
language plpgsql
as $$
declare
  s record;
  a_store uuid;
begin
  select organization_id, country_id, region_id, id
    into s
  from public.stores
  where id = new.store_id;

  if not found then
    raise exception 'ticket store_id % not found', new.store_id;
  end if;

  if new.organization_id is distinct from s.organization_id then
    raise exception 'ticket organization_id does not match store';
  end if;
  if new.country_id is distinct from s.country_id then
    raise exception 'ticket country_id does not match store';
  end if;
  if new.region_id is distinct from s.region_id then
    raise exception 'ticket region_id does not match store';
  end if;

  if new.asset_id is not null then
    select store_id into a_store from public.assets where id = new.asset_id;
    if a_store is null then
      raise exception 'ticket asset_id not found';
    end if;
    if a_store is distinct from new.store_id then
      raise exception 'asset does not belong to ticket store';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_hierarchy on public.tickets;
create trigger trg_tickets_hierarchy
  before insert or update of store_id, organization_id, country_id, region_id, asset_id
  on public.tickets
  for each row execute function public.enforce_ticket_hierarchy();

create or replace function public.enforce_store_region_country()
returns trigger
language plpgsql
as $$
declare
  r_country uuid;
begin
  select country_id into r_country from public.regions where id = new.region_id;
  if r_country is null then
    raise exception 'store region_id not found';
  end if;
  if r_country is distinct from new.country_id then
    raise exception 'store region does not belong to store country';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stores_region_country on public.stores;
create trigger trg_stores_region_country
  before insert or update of region_id, country_id
  on public.stores
  for each row execute function public.enforce_store_region_country();

-- ---------------------------------------------------------------------------
-- Drop permissive bootstrap policies
-- ---------------------------------------------------------------------------

drop policy if exists org_read_authenticated on public.organizations;
drop policy if exists countries_read_authenticated on public.countries;
drop policy if exists regions_read_authenticated on public.regions;
drop policy if exists stores_read_authenticated on public.stores;
drop policy if exists tickets_read_authenticated on public.tickets;
drop policy if exists tickets_update_authenticated on public.tickets;
drop policy if exists ticket_messages_read_authenticated on public.ticket_messages;
drop policy if exists ticket_events_read_authenticated on public.ticket_events;
drop policy if exists assets_read_authenticated on public.assets;

-- Helper: membership visibility
create or replace function public.can_read_ticket(t public.tickets)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.profile_id = auth.uid()
      and m.organization_id = t.organization_id
      and (
        m.role in ('global_admin', 'global_maintenance')
        or (m.role = 'country_manager' and m.country_id = t.country_id)
        or (m.role = 'regional_manager' and m.region_id = t.region_id)
        or (m.role in ('store_manager', 'store_employee') and m.store_id = t.store_id)
        or (
          m.role in ('internal_technician', 'external_provider')
          and t.assigned_to = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_mutate_hq_ticket(t public.tickets)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.profile_id = auth.uid()
      and m.organization_id = t.organization_id
      and (
        m.role in ('global_admin', 'global_maintenance')
        or (m.role = 'country_manager' and m.country_id = t.country_id)
        or (m.role = 'regional_manager' and m.region_id = t.region_id)
        or (m.role = 'store_manager' and m.store_id = t.store_id)
      )
  );
$$;

-- Tickets
create policy tickets_select_scoped on public.tickets
  for select to authenticated
  using (public.can_read_ticket(tickets));

create policy tickets_update_scoped on public.tickets
  for update to authenticated
  using (public.can_mutate_hq_ticket(tickets) or (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and m.role in ('internal_technician', 'external_provider')
    )
  ))
  with check (public.can_mutate_hq_ticket(tickets) or assigned_to = auth.uid());

create policy tickets_insert_scoped on public.tickets
  for insert to authenticated
  with check (public.can_mutate_hq_ticket(tickets));

-- Messages / events / attachments follow ticket read
create policy ticket_messages_select_scoped on public.ticket_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and public.can_read_ticket(t)
    )
  );

create policy ticket_events_select_scoped on public.ticket_events
  for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and public.can_read_ticket(t)
    )
  );

create policy ticket_attachments_select_scoped on public.ticket_attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and public.can_read_ticket(t)
    )
  );

-- Org tree: membership-scoped
create policy organizations_select_scoped on public.organizations
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid() and m.organization_id = organizations.id
    )
  );

create policy countries_select_scoped on public.countries
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and m.organization_id = countries.organization_id
        and (
          m.role in ('global_admin', 'global_maintenance')
          or m.country_id = countries.id
        )
    )
  );

create policy regions_select_scoped on public.regions
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and (
          m.role in ('global_admin', 'global_maintenance')
          or m.country_id = regions.country_id
          or m.region_id = regions.id
        )
    )
  );

create policy stores_select_scoped on public.stores
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and m.organization_id = stores.organization_id
        and (
          m.role in ('global_admin', 'global_maintenance')
          or m.country_id = stores.country_id
          or m.region_id = stores.region_id
          or m.store_id = stores.id
        )
    )
  );

create policy assets_select_scoped on public.assets
  for select to authenticated
  using (
    exists (
      select 1 from public.stores s
      join public.memberships m on m.organization_id = s.organization_id
      where s.id = assets.store_id
        and m.profile_id = auth.uid()
        and (
          m.role in ('global_admin', 'global_maintenance')
          or m.country_id = s.country_id
          or m.region_id = s.region_id
          or m.store_id = s.id
        )
    )
  );

-- Profiles: self read
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy memberships_select_self on public.memberships
  for select to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- France country + store 172 (same code, different country)
-- ---------------------------------------------------------------------------

insert into public.countries (
  id, organization_id, code, name, default_locale,
  whatsapp_phone_number_id, whatsapp_display_phone
) values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'FR',
  'France',
  'fr',
  'wa_phone_fr_demo',
  '+33100000000'
)
on conflict (organization_id, code) do update
set whatsapp_phone_number_id = excluded.whatsapp_phone_number_id;

insert into public.regions (id, country_id, code, name) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333333', 'IDF', 'Île-de-France')
on conflict (country_id, code) do nothing;

insert into public.stores (organization_id, country_id, region_id, code, name, city)
values (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444401',
  '172',
  'Paris Opéra',
  'Paris'
)
on conflict (country_id, code) do nothing;

-- Israel WA phone number id (production routing)
update public.countries
set whatsapp_phone_number_id = coalesce(whatsapp_phone_number_id, 'wa_phone_il_demo')
where id = '22222222-2222-2222-2222-222222222222';

-- Known employee phone → Store 172 IL
insert into public.store_phones (store_id, wa_id, is_primary, label)
select s.id, '972501112233', true, 'QA known employee'
from public.stores s
where s.code = '172'
  and s.country_id = '22222222-2222-2222-2222-222222222222'
on conflict (store_id, wa_id) do nothing;
