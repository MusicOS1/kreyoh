-- Limited, revocable, per-project authority to create/update studio session records.
-- Session recording is not project membership and never grants Admin or Finance access.
create table if not exists public.studio_session_recorders(
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 active boolean not null default true,
 granted_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (project_id,user_id)
);
create index if not exists studio_session_recorders_user_active_idx
 on public.studio_session_recorders(user_id,project_id) where active;
alter table public.studio_session_recorders enable row level security;
revoke all on public.studio_session_recorders from anon,authenticated;
comment on table public.studio_session_recorders is
 'Revocable studio-session recording scope only; no project membership, finance or Admin grant.';
