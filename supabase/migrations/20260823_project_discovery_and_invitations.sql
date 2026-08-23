-- FACKTS Music multi-project entry flow. Additive: preserves Project 001.
create extension if not exists pgcrypto;

alter table public.projects
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private','discoverable')),
  add column if not exists join_requests_open boolean not null default false,
  add column if not exists artwork_url text,
  add column if not exists created_by uuid references public.profiles(id);

create table if not exists public.project_join_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending','approved','declined','cancelled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists project_join_requests_one_pending
  on public.project_join_requests(project_id,user_id) where status='pending';
create index if not exists project_join_requests_project_status_idx
  on public.project_join_requests(project_id,status,created_at desc);

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  invited_by uuid not null references public.profiles(id),
  message text,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists project_invitations_one_pending
  on public.project_invitations(project_id,user_id) where status='pending';
create index if not exists project_invitations_user_status_idx
  on public.project_invitations(user_id,status,created_at desc);

-- Preserve invitations created by the earlier membership-based workflow.
insert into public.project_invitations(project_id,user_id,role_id,invited_by,message,status)
select pm.project_id, pm.user_id, mr.role_id,
  coalesce((select pm2.user_id from public.project_members pm2 join public.member_roles mr2 on mr2.project_member_id=pm2.id join public.roles r2 on r2.id=mr2.role_id where pm2.project_id=pm.project_id and pm2.status='active' and r2.name in ('Super Admin','Admin','Project Lead') limit 1), pm.user_id),
  'Invitation migrated from the founding Project 001 workflow.', 'pending'
from public.project_members pm
join public.member_roles mr on mr.project_member_id=pm.id
where pm.status in ('pending','invited')
and not exists(select 1 from public.project_invitations i where i.project_id=pm.project_id and i.user_id=pm.user_id and i.status='pending');

alter table public.project_join_requests enable row level security;
alter table public.project_invitations enable row level security;

drop policy if exists "Authenticated discover projects" on public.projects;
create policy "Authenticated discover projects" on public.projects for select to authenticated using (
  visibility='discoverable'
  or public.is_project_member(id)
  or exists(select 1 from public.project_invitations i where i.project_id=id and i.user_id=auth.uid())
);
drop policy if exists "Users read own join requests" on public.project_join_requests;
create policy "Users read own join requests" on public.project_join_requests for select to authenticated using (
  user_id=auth.uid() or public.has_project_role(project_id,array['Super Admin','Admin','Project Lead'])
);
drop policy if exists "Users read own invitations" on public.project_invitations;
create policy "Users read own invitations" on public.project_invitations for select to authenticated using (
  user_id=auth.uid() or public.has_project_role(project_id,array['Super Admin','Admin','Project Lead'])
);

-- Make the founding project discoverable only if the team explicitly opens requests.
update public.projects set visibility=coalesce(visibility,'private') where code='PROJECT 001';
