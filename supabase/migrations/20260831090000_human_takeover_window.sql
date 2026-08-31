-- Per-chat private ops window (bot stays on everywhere else).
-- Legacy permanent human_takeover flags are cleared so the bot resumes.

alter table public.intake_sessions
  add column if not exists human_takeover_until timestamptz;

comment on column public.intake_sessions.human_takeover_until is
  'When set with human_takeover=true, bot is paused for this wa_id only until this timestamp.';

update public.intake_sessions
set
  human_takeover = false,
  human_takeover_until = null
where human_takeover is true;
