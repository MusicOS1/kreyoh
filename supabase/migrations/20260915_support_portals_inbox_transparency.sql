-- FACKTS Music — Support Portals, Inbox & Transparency
-- Additive only. No voting data is altered.

create extension if not exists pgcrypto;

-- Ensure support roles exist.
insert into public.roles(name)
select role_name
from unnest(array['A&R','Manager','Studio Owner']) as role_name
where not exists (
  select 1 from public.roles r where r.name = role_name
);

create table if not exists public.project_support_relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  support_user_id uuid not null references public.profiles(id) on delete cascade,
  support_role text not null
    check (support_role in ('A&R','Manager','Studio Owner')),
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending','active','declined','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,artist_id,support_user_id,support_role)
);

create index if not exists project_support_relationships_project_idx
  on public.project_support_relationships(project_id,status,support_role);

create index if not exists project_support_relationships_support_idx
  on public.project_support_relationships(support_user_id,status);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  version_label text,
  summary text not null,
  general_impact text,
  impact_ar text,
  impact_manager text,
  impact_studio_owner text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists project_updates_project_idx
  on public.project_updates(project_id,created_at desc);

alter table public.notifications
  add column if not exists action_url text,
  add column if not exists audience_role text,
  add column if not exists importance text not null default 'normal'
    check (importance in ('normal','important','urgent'));

alter table public.project_support_relationships enable row level security;
alter table public.project_updates enable row level security;

drop policy if exists "Project members read support relationships"
  on public.project_support_relationships;

create policy "Project members read support relationships"
  on public.project_support_relationships
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members read updates"
  on public.project_updates;

create policy "Project members read updates"
  on public.project_updates
  for select to authenticated
  using (public.is_project_member(project_id));

-- Server actions perform writes with the service/admin client.
-- No browser write policies are created.

-- VOTING SAFETY:
-- This migration does not reference or modify voting tables,
-- rankings, ballots, vote records or voting RLS.
