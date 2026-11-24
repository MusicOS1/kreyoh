-- FACKTS Music permanent company book and Third Culture external partner book are separate.
-- This migration is versioned for review. Do not auto-run against production.
-- Project ledgers, project.owner_id and music ownership are never rewritten.

create table if not exists public.finance_books (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug in ('fackts_music_platform','third_culture')),
 name text not null,
 book_kind text not null check(book_kind in ('platform','organisation')),
 description text,
 currency text not null default 'KES' check(currency='KES'),
 created_at timestamptz not null default now()
);
create table if not exists public.finance_book_entries (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.finance_books(id) on delete restrict,
 entry_type text not null check(entry_type in ('income','expense')),
 amount_kes numeric(14,2) not null check(amount_kes>0 and amount_kes<=10000000),
 category text not null check(length(trim(category)) between 2 and 90),
 description text not null check(length(trim(description)) between 3 and 500),
 entry_date date not null,
 reference text,
 status text not null default 'draft' check(status in ('draft','posted')),
 created_by uuid not null references auth.users(id),
 posted_by uuid references auth.users(id),
 posted_at timestamptz,
 created_at timestamptz not null default now(),
 constraint finance_book_entries_posting check(
  (status='draft' and posted_at is null and posted_by is null) or
  (status='posted' and posted_at is not null and posted_by is not null)
 )
);
create index if not exists finance_book_entries_lookup
 on public.finance_book_entries(book_id,entry_date desc,id desc);
create table if not exists public.finance_book_project_links (
 project_id uuid primary key references public.projects(id) on delete restrict,
 book_id uuid not null references public.finance_books(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index if not exists finance_book_project_links_book_idx
 on public.finance_book_project_links(book_id);

-- No public Data API access: only the server, after an explicit Control Room
-- 'finance' permission check, may use these service-role tables.
alter table public.finance_books enable row level security;
alter table public.finance_book_entries enable row level security;
alter table public.finance_book_project_links enable row level security;
revoke all on public.finance_books,public.finance_book_entries,public.finance_book_project_links from anon,authenticated;

-- Organisational books are not banking accounts or a custodial wallet.
insert into public.finance_books (slug,name,book_kind,description)
 values
 ('fackts_music_platform','FACKTS Music platform','platform','FACKTS Music platform operations only; not Third Culture or creator finances'),
 ('third_culture','Third Culture','organisation','Temporary external partner finance; separate from FACKTS Music business. No automatic renewal; TUKO project income remains separately itemised')
on conflict(slug) do nothing;

-- Assign an operating-entity relationship for Project 001 only.
-- DOES NOT alter projects.owner_id, rights, royalties, splits, or balances.
insert into public.finance_book_project_links(project_id,book_id)
select p.id,b.id from public.projects p cross join public.finance_books b
where p.id='3bbead35-ed53-4507-9943-ff6255b0f1ce'::uuid
and b.slug='third_culture'
on conflict(project_id) do nothing;
