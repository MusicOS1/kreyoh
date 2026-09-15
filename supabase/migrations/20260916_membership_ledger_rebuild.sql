-- FACKTS Music — Membership Ledger Rebuild
-- Separates member commitment/allocation from individual payment transactions.
-- Additive and non-destructive.
-- Existing project_membership_fees rows are preserved as historical source records.
-- No voting table or voting data is touched.

create extension if not exists pgcrypto;

create table if not exists public.project_membership_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  member_code text not null,
  allocated_amount numeric(14,2) not null default 0 check (allocated_amount >= 0),
  currency text not null default 'KES',
  allocation_note text,
  needs_reconciliation boolean not null default false,
  status text not null default 'active'
    check (status in ('active','closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, member_user_id),
  unique(project_id, member_code)
);

create index if not exists project_membership_accounts_project_idx
  on public.project_membership_accounts(project_id, status, member_code);

create table if not exists public.project_membership_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.project_membership_accounts(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_code text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'KES',
  transaction_date date not null default current_date,
  payment_method text not null default 'Other',
  payment_reference text,
  note text,
  status text not null default 'posted'
    check (status in ('posted','reversed')),
  reversal_reason text,
  reversed_by uuid references public.profiles(id) on delete set null,
  reversed_at timestamptz,
  recorded_by uuid not null references public.profiles(id),
  source_legacy_fee_id uuid unique references public.project_membership_fees(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(project_id, transaction_code)
);

create index if not exists project_membership_transactions_project_idx
  on public.project_membership_transactions(project_id, transaction_date desc, created_at desc);

create index if not exists project_membership_transactions_member_idx
  on public.project_membership_transactions(project_id, member_user_id, transaction_date desc);

-- Backfill one membership account per member from the OLD fee records.
-- IMPORTANT:
-- The old UI mixed allocation and payment, so imported allocation figures are
-- deliberately marked needs_reconciliation=true. Nothing is guessed or deleted.
insert into public.project_membership_accounts (
  project_id,
  member_user_id,
  member_code,
  allocated_amount,
  currency,
  allocation_note,
  needs_reconciliation,
  created_by,
  created_at,
  updated_at
)
select
  f.project_id,
  f.member_user_id,
  'FM-' || upper(substr(md5(f.project_id::text || ':' || f.member_user_id::text), 1, 8)),
  sum(f.amount_due),
  coalesce(max(f.currency), 'KES'),
  'Imported from the previous membership fee system. Review this commitment once because the previous workflow mixed allocation and payment.',
  true,
  max(f.created_by::text)::uuid,
  min(f.created_at),
  now()
from public.project_membership_fees f
group by f.project_id, f.member_user_id
on conflict (project_id, member_user_id) do nothing;

-- Backfill existing paid balances as historical opening transactions.
-- The old table did not preserve every individual payment event, so we do NOT
-- fabricate detailed historic transactions. Each old fee row with amount_paid > 0
-- becomes one clearly-labelled legacy transaction.
insert into public.project_membership_transactions (
  account_id,
  project_id,
  member_user_id,
  transaction_code,
  amount,
  currency,
  transaction_date,
  payment_method,
  payment_reference,
  note,
  status,
  recorded_by,
  source_legacy_fee_id,
  created_at
)
select
  a.id,
  f.project_id,
  f.member_user_id,
  'LEG-' || upper(substr(replace(f.id::text, '-', ''), 1, 10)),
  f.amount_paid,
  f.currency,
  coalesce(f.paid_date, f.due_date, f.created_at::date),
  'Legacy import',
  f.payment_reference,
  trim(
    both ' ' from
    concat(
      'Imported opening payment from old membership record',
      case when f.fee_period is not null then ' · ' || f.fee_period else '' end,
      case when f.notes is not null and f.notes <> '' then ' · ' || f.notes else '' end
    )
  ),
  'posted',
  f.created_by,
  f.id,
  f.created_at
from public.project_membership_fees f
join public.project_membership_accounts a
  on a.project_id = f.project_id
 and a.member_user_id = f.member_user_id
where f.amount_paid > 0
on conflict (source_legacy_fee_id) do nothing;

alter table public.project_membership_accounts enable row level security;
alter table public.project_membership_transactions enable row level security;

drop policy if exists "Members read own membership account"
  on public.project_membership_accounts;

create policy "Members read own membership account"
  on public.project_membership_accounts
  for select
  to authenticated
  using (
    member_user_id = auth.uid()
    or public.has_project_role(
      project_id,
      array['Super Admin','Admin','Project Lead','Finance','A&R','Manager','Studio Owner']
    )
  );

drop policy if exists "Members read own membership transactions"
  on public.project_membership_transactions;

create policy "Members read own membership transactions"
  on public.project_membership_transactions
  for select
  to authenticated
  using (
    member_user_id = auth.uid()
    or public.has_project_role(
      project_id,
      array['Super Admin','Admin','Project Lead','Finance','A&R','Manager','Studio Owner']
    )
  );

-- Writes happen through authorised server actions.
-- Existing project_membership_fees data remains untouched for audit/history.
-- VOTING SAFETY: no voting table is referenced or altered.
