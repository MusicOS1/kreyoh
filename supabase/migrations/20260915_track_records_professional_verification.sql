-- FACKTS Music — Track Records + Verified Professional Record
-- Additive only.
-- IMPORTANT: no voting table, ranking table, ballot table or vote record is altered.

create extension if not exists pgcrypto;

create table if not exists public.track_rights_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  check_key text not null,
  status text not null default 'pending'
    check (status in ('pending','clear','not_applicable','blocked')),
  evidence_note text,
  evidence_url text,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(track_id, check_key)
);

create index if not exists track_rights_checks_track_idx
  on public.track_rights_checks(track_id, status);

create table if not exists public.track_release_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  platform_name text not null,
  distributor text,
  release_date date,
  isrc text,
  upc text,
  release_url text,
  release_status text not null default 'planned'
    check (release_status in ('planned','submitted','live','taken_down')),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists track_release_records_track_idx
  on public.track_release_records(track_id, release_date desc);

create table if not exists public.track_release_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'playlist','radio','press','performance','creator_campaign',
      'chart','sync','brand','milestone','audience_feedback',
      'release_issue','other'
    )),
  event_date date not null default current_date,
  organisation text,
  description text not null,
  outcome text,
  evidence_url text,
  value numeric(14,2),
  currency text default 'KES',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists track_release_events_track_idx
  on public.track_release_events(track_id, event_date desc);

create table if not exists public.track_operational_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  session_id uuid references public.studio_sessions(id) on delete set null,
  category text not null
    check (category in (
      'late_artist','no_show','bad_verse','missing_stems','split_confusion',
      'credit_dispute','mixing_confusion','mastering_confusion','sequencing',
      'communication','session_scheduling','approval_delay','approval_rejected',
      'rights_clearance','budget_overrun','technical_file','distribution_release',
      'other'
    )),
  title text not null,
  description text not null,
  severity text not null default 'medium'
    check (severity in ('low','medium','high','critical')),
  status text not null default 'open'
    check (status in ('open','in_progress','resolved','accepted_risk')),
  owner_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  due_date date,
  resolution text,
  lesson_learned text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists track_operational_issues_project_idx
  on public.track_operational_issues(project_id, status, occurred_at desc);
create index if not exists track_operational_issues_track_idx
  on public.track_operational_issues(track_id, status, occurred_at desc);

create table if not exists public.professional_credit_claims (
  id uuid primary key default gen_random_uuid(),
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  work_title text not null,
  primary_artist text,
  contribution_role text not null,
  source_type text not null default 'external'
    check (source_type in ('fackts_internal','external')),
  source_url text,
  verification_status text not null default 'self_claimed'
    check (verification_status in (
      'self_claimed','evidence_attached','contributor_confirmed',
      'fackts_verified','disputed','rejected','withdrawn'
    )),
  verification_note text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professional_credit_claims_claimant_idx
  on public.professional_credit_claims(claimant_id, verification_status, created_at desc);

create table if not exists public.professional_credit_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.professional_credit_claims(id) on delete cascade,
  evidence_type text not null
    check (evidence_type in (
      'release_link','isrc_upc','credits_page','agreement','split_sheet',
      'session_evidence','project_file','distributor_record','other'
    )),
  evidence_url text,
  notes text,
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists professional_credit_evidence_claim_idx
  on public.professional_credit_evidence(claim_id, created_at);

create table if not exists public.professional_credit_confirmations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.professional_credit_claims(id) on delete cascade,
  confirmer_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'requested'
    check (response in ('requested','confirmed','corrected','disputed')),
  note text,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(claim_id, confirmer_id)
);

create index if not exists professional_credit_confirmations_user_idx
  on public.professional_credit_confirmations(confirmer_id, response, requested_at desc);

alter table public.track_rights_checks enable row level security;
alter table public.track_release_records enable row level security;
alter table public.track_release_events enable row level security;
alter table public.track_operational_issues enable row level security;
alter table public.professional_credit_claims enable row level security;
alter table public.professional_credit_evidence enable row level security;
alter table public.professional_credit_confirmations enable row level security;

drop policy if exists "Members read track rights checks" on public.track_rights_checks;
create policy "Members read track rights checks"
  on public.track_rights_checks for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members read track releases" on public.track_release_records;
create policy "Members read track releases"
  on public.track_release_records for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members read track release events" on public.track_release_events;
create policy "Members read track release events"
  on public.track_release_events for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Members read track issues" on public.track_operational_issues;
create policy "Members read track issues"
  on public.track_operational_issues for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Users read own professional claims" on public.professional_credit_claims;
create policy "Users read own professional claims"
  on public.professional_credit_claims for select to authenticated
  using (claimant_id = auth.uid());

drop policy if exists "Users read evidence for own claims" on public.professional_credit_evidence;
create policy "Users read evidence for own claims"
  on public.professional_credit_evidence for select to authenticated
  using (
    exists (
      select 1 from public.professional_credit_claims c
      where c.id = claim_id and c.claimant_id = auth.uid()
    )
  );

drop policy if exists "Users read confirmation requests involving them" on public.professional_credit_confirmations;
create policy "Users read confirmation requests involving them"
  on public.professional_credit_confirmations for select to authenticated
  using (
    confirmer_id = auth.uid()
    or exists (
      select 1 from public.professional_credit_claims c
      where c.id = claim_id and c.claimant_id = auth.uid()
    )
  );

-- No browser write policies are created.
-- All writes go through authorised server actions.
-- Voting safety: no track_votes, track_version_rankings, track_voting_rounds or ballot records are modified.
