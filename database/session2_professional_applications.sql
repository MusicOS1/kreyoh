-- FACKTS Music V4 / Session 2. Staged migration only.
-- DO NOT run against the production Supabase project without explicit approval.
-- Use a staging clone/database, then generate a timestamped migration with your installed Supabase CLI.

begin;

create table if not exists public.professional_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  profession text not null check (profession in (
    'Artist','Producer','Beatmaker','Songwriter','Composer','Engineer',
    'A&R','Manager','Videographer','Photographer','Designer',
    'Visual Creative','Session Musician','Studio Owner','Project Coordinator','Other Creative'
  )),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  bio text not null default '' check (length(bio) <= 2000),
  skills text[] not null default '{}',
  experience_years integer check (experience_years between 0 and 80),
  portfolio_url text check (length(portfolio_url) <= 500),
  status text not null default 'draft'
    check (status in ('draft','submitted','under_review','approved','rejected','changes_requested')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,profession)
);

create index if not exists professional_applications_status_idx
  on public.professional_applications(status,submitted_at desc);
create index if not exists professional_applications_user_idx
  on public.professional_applications(user_id,updated_at desc);

create table if not exists public.professional_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.professional_applications(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status text,
  to_status text not null,
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists professional_application_events_application_idx
  on public.professional_application_events(application_id,created_at desc);

-- These tables are server-only. All user and reviewer writes use verified
-- server actions, never a browser service-role key.
alter table public.professional_applications enable row level security;
alter table public.professional_application_events enable row level security;
revoke all on public.professional_applications from public, anon, authenticated;
revoke all on public.professional_application_events from public, anon, authenticated;
grant select,insert,update,delete on public.professional_applications to service_role;
grant select,insert on public.professional_application_events to service_role;

-- Record status transitions atomically with the row update.
-- The actor is sourced from verified server-action fields. A new applicant
-- submission explicitly clears prior reviewer details.
create or replace function public.capture_professional_application_transition()
returns trigger language plpgsql security invoker set search_path = public as $$
declare transition_actor uuid;
begin
  if tg_op = 'INSERT' then
    if new.status = 'draft' then return new; end if;
    transition_actor := new.user_id;
    insert into public.professional_application_events
      (application_id,actor_id,from_status,to_status,note)
    values(new.id,transition_actor,null,new.status,null);
  elsif old.status is distinct from new.status then
    transition_actor := case
      when new.status in ('submitted','draft') then new.user_id
      else coalesce(new.reviewed_by,new.user_id)
    end;
    insert into public.professional_application_events
      (application_id,actor_id,from_status,to_status,note)
    values(new.id,transition_actor,old.status,new.status,
      case when new.status in ('under_review','approved','rejected','changes_requested')
        then new.review_note else null end);
  end if;
  return new;
end $$;
revoke all on function public.capture_professional_application_transition()
  from public, anon, authenticated;
drop trigger if exists professional_application_transition on public.professional_applications;
create trigger professional_application_transition
  after insert or update of status on public.professional_applications
  for each row execute function public.capture_professional_application_transition();

commit;

-- Staging acceptance (no production user data):
-- 1. Confirm both tables have RLS enabled.
-- 2. Confirm anon/authenticated have no table privileges.
-- 3. Check one applicant can submit only their own record through server actions.
-- 4. Verify events written for submitted -> under_review -> approved.
-- 5. Verify the same applicant cannot approve themselves.
