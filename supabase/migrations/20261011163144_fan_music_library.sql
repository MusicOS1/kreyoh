create table public.fan_music_library (
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('saved','following','recent','playlist')),
 item_id uuid not null,
 label text not null default '' check (length(label)<=60),
 track_ids uuid[] not null default '{}' check (cardinality(track_ids)<=200),
 updated_at timestamptz not null default now(),
 primary key(user_id,kind,item_id)
);
alter table public.fan_music_library enable row level security;
revoke all on public.fan_music_library from public,anon,authenticated;
grant select,insert,update,delete on public.fan_music_library to service_role;
create index fan_library_recent on public.fan_music_library(user_id,kind,updated_at desc);
