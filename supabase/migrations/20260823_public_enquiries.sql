create table if not exists public.public_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_type text not null check (enquiry_type in ('contact','partnership')),
  name text not null,
  organisation text,
  email text not null,
  phone text,
  subject text,
  partnership_type text,
  message text not null,
  status text not null default 'new' check (status in ('new','reviewing','responded','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_enquiries_created_at_idx on public.public_enquiries (created_at desc);
create index if not exists public_enquiries_status_idx on public.public_enquiries (status, enquiry_type);
alter table public.public_enquiries enable row level security;

-- Public forms insert through a validated server action using the service role.
-- No anonymous read or write policy is intentionally created.
