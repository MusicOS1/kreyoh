-- FACKTS Music multi-project operations foundation.
-- Additive only: this migration does not update or recreate voting tables.

alter table public.projects
  add column if not exists project_type text not null default 'Music Project',
  add column if not exists current_stage text not null default 'Project Setup',
  add column if not exists next_action text,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

update public.projects
set current_stage = 'Development / Production',
    next_action = coalesce(next_action, 'Complete internal voting and prepare external A&R review')
where code = 'PROJECT 001';

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  stage text not null,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','complete','blocked','needs_attention')),
  position integer not null default 0,
  due_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, title)
);
create index if not exists project_milestones_project_position_idx
  on public.project_milestones(project_id, position, created_at);

insert into public.project_milestones(project_id,title,stage,status,position)
select p.id, seed.title, seed.stage, seed.status, seed.position
from public.projects p
cross join (values
  ('Project setup','Project Setup','complete',10),
  ('Creative development','Creative Development','in_progress',20),
  ('Production and remaining recording','Production','in_progress',30),
  ('Complete internal voting','Voting','needs_attention',40),
  ('External A&R review','A&R Review','not_started',50),
  ('Final song selection','Final Song Selection','not_started',60),
  ('Confirm splits and credits','Splits & Credits','not_started',70),
  ('Mixing and mastering','Mixing / Mastering','not_started',80),
  ('Release preparation','Release Preparation','not_started',90),
  ('Commercialisation plan','Commercialisation','not_started',100)
) as seed(title,stage,status,position)
where p.code='PROJECT 001'
on conflict(project_id,title) do nothing;

create table if not exists public.platform_suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  suggestion_type text not null
    check (suggestion_type in ('platform_improvement','project_idea','track_project_feedback','bug_problem','other')),
  suggestion text not null check (char_length(suggestion) between 3 and 5000),
  status text not null default 'new'
    check (status in ('new','reviewing','accepted','planned','closed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists platform_suggestions_status_created_idx
  on public.platform_suggestions(status, created_at desc);

alter table public.project_milestones enable row level security;
alter table public.platform_suggestions enable row level security;

drop policy if exists "Members read project milestones" on public.project_milestones;
create policy "Members read project milestones" on public.project_milestones
for select to authenticated using (public.is_project_member(project_id));

drop policy if exists "Project management manages milestones" on public.project_milestones;
create policy "Project management manages milestones" on public.project_milestones
for all to authenticated
using (public.has_project_role(project_id,array['Super Admin','Admin','Project Lead']))
with check (public.has_project_role(project_id,array['Super Admin','Admin','Project Lead']));

drop policy if exists "Users create suggestions" on public.platform_suggestions;
create policy "Users create suggestions" on public.platform_suggestions
for insert to authenticated with check (submitted_by=auth.uid());

drop policy if exists "Users read own suggestions" on public.platform_suggestions;
create policy "Users read own suggestions" on public.platform_suggestions
for select to authenticated using (submitted_by=auth.uid());

notify pgrst, 'reload schema';
