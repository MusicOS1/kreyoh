-- FACKTS public fan likes: independent, additive activation.
-- The deployed database has not yet received the full Session 4/Billboard migration.
-- Never convert saved songs to likes. Do not alter old releases or audio.
create table if not exists public.music_release_likes (
 release_id uuid not null references public.music_releases(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(release_id,user_id)
);
create index if not exists music_release_likes_created on public.music_release_likes(created_at desc);
create table if not exists public.music_like_events (
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.music_releases(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('like','unlike')),
 created_at timestamptz not null default now()
);
create index if not exists music_like_events_release_date on public.music_like_events(release_id,created_at desc);
alter table public.music_release_likes enable row level security;
alter table public.music_like_events enable row level security;
revoke all on public.music_release_likes,public.music_like_events from public,anon,authenticated;
grant select,insert,update,delete on public.music_release_likes,public.music_like_events to service_role;
create or replace function public.music_capture_like() returns trigger
 language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  insert into public.music_like_events(release_id,user_id,action) values(new.release_id,new.user_id,'like');
  return new;
 elsif tg_op='DELETE' then
  insert into public.music_like_events(release_id,user_id,action) values(old.release_id,old.user_id,'unlike');
  return old;
 end if;
 return null;
end $$;
revoke all on function public.music_capture_like() from public,anon,authenticated;
drop trigger if exists music_capture_like_change on public.music_release_likes;
create trigger music_capture_like_change after insert or delete on public.music_release_likes
 for each row execute function public.music_capture_like();
