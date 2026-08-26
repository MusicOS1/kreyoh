-- Internal track voting and readable public creator URLs.
-- Additive and safe for existing Project 001 data.

alter table public.profiles add column if not exists public_slug text;

update public.profiles
set public_slug = trim(both '-' from lower(regexp_replace(coalesce(nullif(stage_name, ''), nullif(nickname, ''), 'creator'), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substring(id::text from 1 for 6)
where public_slug is null or public_slug = '';

create unique index if not exists profiles_public_slug_key on public.profiles(public_slug);

create table if not exists public.track_votes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(track_id, user_id)
);

create index if not exists track_votes_project_track_idx on public.track_votes(project_id, track_id);
alter table public.track_votes enable row level security;

drop policy if exists "project members can view track votes" on public.track_votes;
create policy "project members can view track votes" on public.track_votes for select to authenticated
using (exists (select 1 from public.project_members pm where pm.project_id = track_votes.project_id and pm.user_id = auth.uid() and pm.status = 'active'));

drop policy if exists "project members can vote" on public.track_votes;
create policy "project members can vote" on public.track_votes for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.project_members pm where pm.project_id = track_votes.project_id and pm.user_id = auth.uid() and pm.status = 'active'));

drop policy if exists "members can remove own track votes" on public.track_votes;
create policy "members can remove own track votes" on public.track_votes for delete to authenticated
using (user_id = auth.uid());
