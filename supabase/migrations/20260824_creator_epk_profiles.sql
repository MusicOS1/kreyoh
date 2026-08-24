alter table public.profiles
  add column if not exists nickname text,
  add column if not exists top_songs jsonb not null default '[]'::jsonb;

