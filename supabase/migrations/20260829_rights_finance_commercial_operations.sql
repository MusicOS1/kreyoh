-- Real project-scoped rights, finance and commercial operations.
-- Additive only. Existing voting tables and records are not changed.

insert into public.roles(name)
select value from unnest(array['Project Owner','Project Admin','Manager','Contributor','External A&R','Viewer']) value
where not exists(select 1 from public.roles where name=value);

create table if not exists public.track_splits (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade, contributor_id uuid not null references public.profiles(id) on delete cascade,
  contribution_role text not null, percentage numeric(5,2) not null check(percentage>=0 and percentage<=100),
  status text not null default 'draft' check(status in('draft','awaiting_confirmation','confirmed')),
  confirmed_at timestamptz, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(track_id,contributor_id,contribution_role)
);
create index if not exists track_splits_project_track_idx on public.track_splits(project_id,track_id);

create table if not exists public.project_budgets (
  project_id uuid primary key references public.projects(id) on delete cascade, budget_amount numeric(14,2) not null default 0 check(budget_amount>=0),
  currency text not null default 'KES', updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, track_id uuid references public.tracks(id) on delete set null,
  amount numeric(14,2) not null check(amount>0), currency text not null default 'KES', expense_date date not null default current_date,
  category text not null, vendor text, payment_status text not null default 'committed' check(payment_status in('committed','paid','cancelled')),
  notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists project_expenses_project_date_idx on public.project_expenses(project_id,expense_date desc);

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, track_id uuid references public.tracks(id) on delete set null,
  opportunity_type text not null, organisation text, contact_person text, revenue_pathway text not null, assigned_owner uuid references public.profiles(id) on delete set null,
  date_identified date not null default current_date, estimated_value numeric(14,2), negotiated_value numeric(14,2), contracted_value numeric(14,2), currency text not null default 'KES',
  status text not null default 'identified' check(status in('identified','researching','preparing_pitch','pitched','follow_up','interested','in_discussion','negotiating','contracting','won','lost','on_hold','completed')),
  next_action text, follow_up_date date, notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists commercial_opportunities_pipeline_idx on public.commercial_opportunities(project_id,status,follow_up_date);

create table if not exists public.revenue_records (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, track_id uuid references public.tracks(id) on delete set null,
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null, revenue_source text not null, amount numeric(14,2) not null check(amount>=0), currency text not null default 'KES',
  expected_date date, received_date date, payment_status text not null default 'expected' check(payment_status in('expected','invoiced','partially_paid','paid','overdue','cancelled')),
  notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists revenue_records_project_status_idx on public.revenue_records(project_id,payment_status,received_date);

create table if not exists public.commercial_contacts (
  id uuid primary key default gen_random_uuid(), organisation text not null, contact_person text, contact_role text,
  contact_type text not null default 'other', email text, phone text, platform text, location text,
  relationship_owner uuid references public.profiles(id) on delete set null, last_contact date, next_follow_up date,
  notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists commercial_contacts_type_followup_idx on public.commercial_contacts(contact_type,next_follow_up);

create table if not exists public.creator_campaigns (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null, campaign_name text not null, objective text,
  start_date date, end_date date, budget numeric(14,2), currency text not null default 'KES',
  campaign_owner uuid references public.profiles(id) on delete set null, status text not null default 'planning',
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists creator_campaigns_project_status_idx on public.creator_campaigns(project_id,status);

create table if not exists public.campaign_creators (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.creator_campaigns(id) on delete cascade,
  creator_name text not null, platform text, audience_size bigint, contact_status text not null default 'target',
  content_link text, reach bigint, cost numeric(14,2), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists campaign_creators_campaign_status_idx on public.campaign_creators(campaign_id,contact_status);

alter table public.track_splits enable row level security; alter table public.project_budgets enable row level security;
alter table public.project_expenses enable row level security; alter table public.commercial_opportunities enable row level security; alter table public.revenue_records enable row level security;
alter table public.commercial_contacts enable row level security; alter table public.creator_campaigns enable row level security; alter table public.campaign_creators enable row level security;

drop policy if exists "members read track splits" on public.track_splits;
drop policy if exists "management manages track splits" on public.track_splits;
drop policy if exists "contributors confirm own splits" on public.track_splits;
drop policy if exists "finance roles read budgets" on public.project_budgets;
drop policy if exists "finance roles manage budgets" on public.project_budgets;
drop policy if exists "finance roles manage expenses" on public.project_expenses;
drop policy if exists "members read opportunities" on public.commercial_opportunities;
drop policy if exists "commercial roles manage opportunities" on public.commercial_opportunities;
drop policy if exists "finance roles manage revenue" on public.revenue_records;
drop policy if exists "system roles manage commercial contacts" on public.commercial_contacts;
drop policy if exists "members read creator campaigns" on public.creator_campaigns;
drop policy if exists "commercial roles manage creator campaigns" on public.creator_campaigns;
drop policy if exists "members read campaign creators" on public.campaign_creators;
drop policy if exists "commercial roles manage campaign creators" on public.campaign_creators;
create policy "members read track splits" on public.track_splits for select to authenticated using(public.is_project_member(project_id));
create policy "management manages track splits" on public.track_splits for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead']));
create policy "contributors confirm own splits" on public.track_splits for update to authenticated using(contributor_id=auth.uid()) with check(contributor_id=auth.uid());
create policy "finance roles read budgets" on public.project_budgets for select to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance']));
create policy "finance roles manage budgets" on public.project_budgets for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance']));
create policy "finance roles manage expenses" on public.project_expenses for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance']));
create policy "members read opportunities" on public.commercial_opportunities for select to authenticated using(public.is_project_member(project_id));
create policy "commercial roles manage opportunities" on public.commercial_opportunities for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Manager'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Manager']));
create policy "finance roles manage revenue" on public.revenue_records for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','Finance']));
create policy "system roles manage commercial contacts" on public.commercial_contacts for all to authenticated using(public.is_control_room_admin()) with check(public.is_control_room_admin());
create policy "members read creator campaigns" on public.creator_campaigns for select to authenticated using(public.is_project_member(project_id));
create policy "commercial roles manage creator campaigns" on public.creator_campaigns for all to authenticated using(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Manager'])) with check(public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Manager']));
create policy "members read campaign creators" on public.campaign_creators for select to authenticated using(exists(select 1 from public.creator_campaigns c where c.id=campaign_id and public.is_project_member(c.project_id)));
create policy "commercial roles manage campaign creators" on public.campaign_creators for all to authenticated using(exists(select 1 from public.creator_campaigns c where c.id=campaign_id and public.has_project_role(c.project_id,array['Super Admin','Admin','Project Lead','A&R','Manager']))) with check(exists(select 1 from public.creator_campaigns c where c.id=campaign_id and public.has_project_role(c.project_id,array['Super Admin','Admin','Project Lead','A&R','Manager'])));

notify pgrst, 'reload schema';
