-- FACKTS Music project-level membership pledge.
-- ADDITIVE ONLY. No voting table is altered or written to.

create table if not exists public.project_membership_pledges (
  project_id uuid primary key references public.projects(id) on delete cascade,
  pledged_amount numeric(14,2) not null default 0 check (pledged_amount >= 0),
  currency text not null default 'KES',
  notes text,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.project_membership_pledges enable row level security;

drop policy if exists "Project members read membership pledge"
  on public.project_membership_pledges;

create policy "Project members read membership pledge"
  on public.project_membership_pledges
  for select
  to authenticated
  using (public.is_project_member(project_id));

-- Writes happen through authorised server-side actions.
-- VOTING SAFETY: no voting table is referenced or altered.
