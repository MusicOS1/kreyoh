-- Versioned proposal only. No application to production without explicit approval.
-- Finance payment requests are NOT bank ledgers and do NOT post revenue.
-- A "draft" request cannot be paid or treated as a subscription or payout.
create table if not exists public.finance_payment_requests (
 id uuid primary key default gen_random_uuid(),
 public_token uuid not null unique default gen_random_uuid(),
 purpose_code text not null check(purpose_code in (
  'platform_access','artist_onboarding','artist_service','production_service',
  'mix_mastering','fan_membership','artist_support','release_support',
  'sponsorship','commercial_opportunity','licensing','other_approved'
 )),
 receiver_scope text not null check(receiver_scope in ('fackts_music','project')),
 project_id uuid references public.projects(id) on delete restrict,
 description text not null check(char_length(trim(description)) between 5 and 400),
 amount_kes integer not null check(amount_kes between 3 and 1000000),
 recurrence text not null default 'one_time' check(recurrence in ('one_time','monthly','yearly')),
 payer_email text,
 expiry_date date,
 status text not null default 'draft' check(status in ('draft','review_required','approved','paused','cancelled')),
 checkout_state text not null default 'not_configured' check(checkout_state='not_configured'),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint finance_request_receiver_check check (
   (receiver_scope='fackts_music' and project_id is null) or
   (receiver_scope='project' and project_id is not null)
 ),
 constraint finance_request_support_check check (
   purpose_code not in ('artist_support','release_support') or receiver_scope='project'
 ),
 constraint finance_request_recurrence_check check (
   recurrence='one_time' or purpose_code in ('fan_membership','platform_access')
 )
);
create index if not exists finance_payment_requests_created_idx
 on public.finance_payment_requests(created_at desc,id desc);
create index if not exists finance_payment_requests_receiver_idx
 on public.finance_payment_requests(receiver_scope,project_id,created_at desc);
alter table public.finance_payment_requests enable row level security;
revoke all on public.finance_payment_requests from anon,authenticated;
-- Read/write only through the server after active Finance permission checks.
-- Checkout and posted receipts deliberately require a separate approved migration.
