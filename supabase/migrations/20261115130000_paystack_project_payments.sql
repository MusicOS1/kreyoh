-- FACKTS Music: Paystack project invoices, attempts and atomic verified receipts.
-- Additive migration; existing project budgets, expenses and membership history remain intact.
create extension if not exists pgcrypto;

create table if not exists public.project_payment_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid references public.studio_sessions(id) on delete set null,
  public_token uuid not null unique default gen_random_uuid(),
  purpose text not null check (purpose in ('recording_session','project_contribution','camera_hire','set_design','production_service')),
  description text not null check (char_length(description) between 3 and 240),
  amount_kes integer not null check (amount_kes between 3 and 150000),
  payer_email text,
  status text not null default 'open' check (status in ('open','paid','void')),
  created_by uuid not null references public.profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists project_payment_invoices_project_idx on public.project_payment_invoices(project_id,created_at desc);

create table if not exists public.project_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.project_payment_invoices(id) on delete restrict,
  reference text not null unique check (char_length(reference) between 15 and 100),
  payer_email text not null,
  mode text not null check (mode in ('test','live')),
  status text not null default 'created' check (status in ('created','initialized','initialization_failed','pending','failed','succeeded')),
  provider_status text,
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_payment_attempts_invoice_idx on public.project_payment_attempts(invoice_id,created_at desc);

create table if not exists public.project_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.project_payment_invoices(id) on delete restrict,
  attempt_id uuid not null unique references public.project_payment_attempts(id) on delete restrict,
  revenue_record_id uuid not null unique references public.revenue_records(id) on delete restrict,
  reference text not null unique,
  provider_transaction_id text,
  payer_email text not null,
  amount_kes integer not null check (amount_kes > 0),
  mode text not null check (mode in ('test','live')),
  verified_at timestamptz not null default now()
);
create index if not exists project_payment_receipts_verified_idx on public.project_payment_receipts(verified_at desc);

-- Server-only access, including on publicly exposed schemas.
alter table public.project_payment_invoices enable row level security;
alter table public.project_payment_attempts enable row level security;
alter table public.project_payment_receipts enable row level security;
revoke all on public.project_payment_invoices, public.project_payment_attempts, public.project_payment_receipts from public, anon, authenticated;
grant select, insert, update on public.project_payment_invoices, public.project_payment_attempts, public.project_payment_receipts to service_role;

-- Atomic settlement. This is callable only with the Supabase service role.
-- All remote Paystack verification MUST happen on the application server first.
create or replace function public.project_paystack_confirm(
  p_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_mode text,
  p_payer_email text,
  p_provider_transaction_id text default null
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_attempt public.project_payment_attempts%rowtype;
  v_invoice public.project_payment_invoices%rowtype;
  v_revenue_id uuid;
begin
  select * into v_attempt from public.project_payment_attempts
    where reference=p_reference for update;
  if not found then raise exception 'Payment reference not found'; end if;
  select * into v_invoice from public.project_payment_invoices
    where id=v_attempt.invoice_id for update;
  if not found or v_invoice.status='void' then raise exception 'Invoice unavailable'; end if;

  if p_currency <> 'KES' or p_mode<>v_attempt.mode or p_amount_minor<>v_invoice.amount_kes::bigint*100
    or lower(trim(p_payer_email)) <> lower(v_attempt.payer_email)
    or (v_invoice.payer_email is not null and lower(trim(v_invoice.payer_email)) <> lower(v_attempt.payer_email))
  then
    raise exception 'Payment verification mismatched invoice';
  end if;

  if v_attempt.status='succeeded' then
    return jsonb_build_object('state','already_recorded','invoice_id',v_invoice.id);
  end if;
  if v_invoice.status='paid' then
    return jsonb_build_object('state','invoice_already_paid','invoice_id',v_invoice.id);
  end if;

  insert into public.revenue_records (
    project_id, revenue_source, amount, currency, received_date, payment_status, notes, created_by
  ) values (
    v_invoice.project_id,
    'Paystack · ' || replace(v_invoice.purpose,'_',' '),
    v_invoice.amount_kes, 'KES', current_date, 'paid',
    'Verified Paystack '||p_mode||' payment. Invoice: '||v_invoice.id::text||'. Reference: '||v_attempt.reference||'.',
    v_invoice.created_by
  ) returning id into v_revenue_id;

  insert into public.project_payment_receipts (
    invoice_id,attempt_id,revenue_record_id,reference,provider_transaction_id,payer_email,amount_kes,mode
  ) values (
    v_invoice.id,v_attempt.id,v_revenue_id,v_attempt.reference,p_provider_transaction_id,v_attempt.payer_email,v_invoice.amount_kes,v_attempt.mode
  );

  update public.project_payment_attempts set status='succeeded',provider_status='success',updated_at=now() where id=v_attempt.id;
  update public.project_payment_invoices set status='paid',paid_at=now() where id=v_invoice.id;
  return jsonb_build_object('state','recorded','invoice_id',v_invoice.id,'revenue_record_id',v_revenue_id);
end $$;

revoke all on function public.project_paystack_confirm(text,bigint,text,text,text,text) from public,anon,authenticated;
grant execute on function public.project_paystack_confirm(text,bigint,text,text,text,text) to service_role;

-- Existing finance remains the single balance and CSV reporting source.
-- No client can create or mark provider receipts as paid through the Data API.
