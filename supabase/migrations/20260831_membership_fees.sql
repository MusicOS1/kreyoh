-- FACKTS Music membership fee ledger.
-- ADDITIVE ONLY. No voting table is altered or written to.

create table if not exists public.project_membership_fees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  fee_period text not null,
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  currency text not null default 'KES',
  due_date date,
  paid_date date,
  payment_status text not null default 'expected'
    check (payment_status in ('expected','partially_paid','paid','overdue','waived')),
  payment_reference text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, member_user_id, fee_period)
);

create index if not exists project_membership_fees_project_idx
  on public.project_membership_fees(project_id, fee_period, payment_status);

alter table public.project_membership_fees enable row level security;

drop policy if exists "Members read own membership fees" on public.project_membership_fees;
create policy "Members read own membership fees"
  on public.project_membership_fees for select to authenticated
  using (
    member_user_id = auth.uid()
    or public.has_project_role(project_id, array['Super Admin','Admin','Project Lead','Finance'])
  );

-- Writes are server-side through authorised actions.
-- VOTING SAFETY: no voting table is referenced below this line.
