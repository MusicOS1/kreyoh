-- FACKTS Music Control Room, activity, presence, and provider-neutral file infrastructure.
-- Additive: preserves all existing Project 001 records.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists global_role text not null default 'creator',
  add column if not exists last_login_at timestamptz,
  add column if not exists last_logout_at timestamptz,
  add column if not exists last_active_at timestamptz;

alter table public.beats
  add column if not exists storage_provider text not null default 'external',
  add column if not exists storage_key text,
  add column if not exists playback_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text;

create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_name text not null,
  category text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null check (event_name in ('signup_completed','login_completed','logout_completed','password_reset_requested','confirmation_completed','invitation_accepted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_path text,
  current_project_id uuid references public.projects(id) on delete set null,
  status text not null default 'online',
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.system_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'warning',
  source text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.system_settings(setting_key,setting_value,description)
values
  ('platform', '{"display_name":"FACKTS Music","support_email":"hello@facktsafrica.co.ke","registration_enabled":true}'::jsonb, 'Public platform identity and access'),
  ('beats', '{"primary_provider":"r2","default_artist_capacity":3,"max_upload_mb":100}'::jsonb, 'Beat intake defaults'),
  ('email', '{"sender_name":"FACKTS Africa","sender_email":"auth@facktsafrica.co.ke","provider":"resend"}'::jsonb, 'Transactional email identity')
on conflict (setting_key) do nothing;

create index if not exists platform_events_created_idx on public.platform_events(created_at desc);
create index if not exists platform_events_user_idx on public.platform_events(user_id,created_at desc);
create index if not exists platform_events_project_idx on public.platform_events(project_id,created_at desc);
create index if not exists platform_events_category_idx on public.platform_events(category,created_at desc);
create index if not exists auth_events_user_idx on public.auth_events(user_id,created_at desc);
create index if not exists user_presence_active_idx on public.user_presence(last_active_at desc);
create index if not exists beats_storage_provider_idx on public.beats(storage_provider);

alter table public.platform_events enable row level security;
alter table public.auth_events enable row level security;
alter table public.user_presence enable row level security;
alter table public.system_settings enable row level security;
alter table public.system_incidents enable row level security;

-- Control Room reads/writes are performed only by authorised server code
-- using the service role. Normal clients cannot enumerate these tables.

create or replace function public.touch_my_presence(target_path text default null, target_project uuid default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_presence(user_id,current_path,current_project_id,status,last_active_at,updated_at)
  values(auth.uid(),target_path,target_project,'online',now(),now())
  on conflict(user_id) do update set current_path=excluded.current_path,current_project_id=excluded.current_project_id,status='online',last_active_at=now(),updated_at=now();
  update public.profiles set last_active_at=now() where id=auth.uid();
end;
$$;

revoke all on function public.touch_my_presence(text,uuid) from public;
grant execute on function public.touch_my_presence(text,uuid) to authenticated;
