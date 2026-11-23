-- FACKTS Music live support v1. Additive and independently deployable.
-- Only verified server actions using the service role access these tables.
-- No guest or direct browser read/write policies.
create table if not exists public.music_support_threads (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id) on delete cascade,
 subject text not null default 'Help with FACKTS Music',
 status text not null default 'open' check (status in ('open','waiting','resolved')),
 last_message_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint music_support_threads_requester_unique unique (requester_id)
);
create table if not exists public.music_support_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.music_support_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 sender_role text not null check (sender_role in ('customer','agent')),
 body text not null check (char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists music_support_threads_latest_idx on public.music_support_threads(last_message_at desc);
create index if not exists music_support_messages_thread_idx on public.music_support_messages(thread_id,created_at asc);
alter table public.music_support_threads enable row level security;
alter table public.music_support_messages enable row level security;
-- Do not create public access policies. Privileged server actions MUST authenticate
-- users and verify requester ownership or Control Room enquiries permissions.
revoke all on public.music_support_threads from anon,authenticated;
revoke all on public.music_support_messages from anon,authenticated;
