-- FACKTS Music: admin-only catalogue credits and artwork foundation.
-- Additive and safe for existing Project 001 records.

alter table public.beats
  add column if not exists artwork_storage_key text;

alter table public.tracks
  add column if not exists artwork_url text,
  add column if not exists artwork_storage_key text;

create table if not exists public.beat_contributors (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contribution_role text not null default 'producer',
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (beat_id, user_id, contribution_role)
);

create index if not exists beat_contributors_beat_idx
  on public.beat_contributors(beat_id, contribution_role);

alter table public.beat_contributors enable row level security;

drop policy if exists "Project members read beat contributors"
  on public.beat_contributors;

create policy "Project members read beat contributors"
  on public.beat_contributors
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.beats b
      where b.id = beat_id
        and public.is_project_member(b.project_id)
    )
  );

