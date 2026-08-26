-- FACKTS Music: creator EPK media and richer studio history.
-- Additive: preserves all Project 001 records.

alter table public.profiles
  add column if not exists epk_tagline text,
  add column if not exists hero_image_url text,
  add column if not exists photo_catalog jsonb not null default '[]'::jsonb,
  add column if not exists interview_title text,
  add column if not exists interview_url text,
  add column if not exists achievements text[] not null default '{}';

alter table public.project_assets
  add column if not exists version_note text;

alter table public.studio_sessions
  add column if not exists media_source_url text,
  add column if not exists media_notes text,
  add column if not exists is_backlog boolean not null default false;

alter table public.project_tasks
  add column if not exists session_id uuid references public.studio_sessions(id) on delete set null;

create index if not exists project_tasks_session_idx on public.project_tasks(session_id);

create table if not exists public.session_contributions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  contribution_type text not null,
  description text not null check (char_length(description) between 2 and 2000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_contributions_session_idx on public.session_contributions(session_id, created_at);
create index if not exists session_contributions_creator_idx on public.session_contributions(contributor_id, created_at desc);

alter table public.session_contributions enable row level security;

drop policy if exists "Members read session contributions" on public.session_contributions;
create policy "Members read session contributions" on public.session_contributions
  for select to authenticated using (public.is_project_member(project_id));

drop policy if exists "Members record session contributions" on public.session_contributions;
create policy "Members record session contributions" on public.session_contributions
  for insert to authenticated with check (
    created_by = auth.uid()
    and contributor_id = auth.uid()
    and public.is_project_member(project_id)
  );

drop policy if exists "Members create project tasks" on public.project_tasks;
create policy "Members create project tasks" on public.project_tasks
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.is_project_member(project_id)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "Creators upload own profile media" on storage.objects;
create policy "Creators upload own profile media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators delete own profile media" on storage.objects;
create policy "Creators delete own profile media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
