-- FACKTS Music — Monthly Membership Dues Fix
-- Current operating rule: every active project member owes KES 2,000 per month.
-- No pledge/allocation workflow is used for membership dues.
-- Existing legacy tables/data remain untouched for audit history.
-- No voting data is touched.

alter table public.project_membership_accounts
  add column if not exists monthly_fee numeric(14,2) not null default 2000
    check (monthly_fee >= 0);

alter table public.project_membership_transactions
  add column if not exists payment_period date;

-- Current rule for all existing membership accounts.
update public.project_membership_accounts
set
  monthly_fee = 2000,
  needs_reconciliation = false,
  updated_at = now()
where monthly_fee is distinct from 2000
   or needs_reconciliation = true;

-- Give every active project member a membership account.
-- This is independent of whether they have paid before.
insert into public.project_membership_accounts (
  project_id,
  member_user_id,
  member_code,
  allocated_amount,
  monthly_fee,
  currency,
  allocation_note,
  needs_reconciliation,
  status,
  created_by,
  created_at,
  updated_at
)
select
  pm.project_id,
  pm.user_id,
  'FM-' || upper(substr(md5(pm.project_id::text || ':' || pm.user_id::text), 1, 8)),
  0,
  2000,
  'KES',
  'Standard FACKTS Music membership due: KES 2,000 per month.',
  false,
  'active',
  pm.user_id,
  now(),
  now()
from public.project_members pm
join public.profiles p on p.id = pm.user_id
where pm.status = 'active'
on conflict (project_id, member_user_id)
do update set
  monthly_fee = 2000,
  status = 'active',
  needs_reconciliation = false,
  updated_at = now();

-- Attach old/imported transactions to the month in which they were recorded.
update public.project_membership_transactions
set payment_period = date_trunc('month', transaction_date::timestamp)::date
where payment_period is null;

create index if not exists project_membership_transactions_period_idx
  on public.project_membership_transactions(project_id, payment_period, member_user_id, status);

-- The older project_membership_pledges and allocated_amount fields are retained
-- only for historical compatibility. The new UI does not use them for membership dues.

-- VOTING SAFETY:
-- no voting table, ballot, ranking, vote record or voting RLS is modified.
