-- Pilot: allow demo technician profiles without Supabase Auth users yet.
-- HQ/tech demo assign uses fixed profile UUIDs (see seed_demo_technicians).

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Keep id as uuid PK; auth linkage can be re-added when Auth is wired.
comment on table public.profiles is
  'User profiles. Pilot allows rows without auth.users; bind to Auth later.';

-- Fix membership role labels to match enum
-- (seed file uses technician/hq_ops → map to enum values)
