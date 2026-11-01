-- FACKTS public song play measurements (additive).
-- All published releases are eligible; no private studio tracks, existing audio,
-- saves, likes, follower history or public song rows are replaced.
create table if not exists public.music_play_sessions(
 id uuid primary key,
 release_id uuid not null references public.music_releases(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 listener_key text not null check(length(listener_key) between 10 and 110),
 source text not null default 'public-player' check(source in ('public-player','billboard','release')),
 duration_seconds integer not null check(duration_seconds between 3 and 14400),
 listened_seconds integer not null default 0 check(listened_seconds >= 0),
 started_at timestamptz not null default now(),
 qualified_at timestamptz,
 qualified_bucket bigint,
 constraint music_play_qualified_pair check((qualified_at is null and qualified_bucket is null) or (qualified_at is not null and qualified_bucket is not null))
);
create index if not exists music_play_sessions_release_date on public.music_play_sessions(release_id,qualified_at desc) where qualified_at is not null;
create index if not exists music_play_sessions_listener on public.music_play_sessions(listener_key,qualified_at desc);
create unique index if not exists music_play_unique_quarter_hour on public.music_play_sessions(release_id,listener_key,qualified_bucket) where qualified_bucket is not null;
alter table public.music_play_sessions enable row level security;
revoke all on public.music_play_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.music_play_sessions to service_role;
create or replace function public.public_release_play_counts(p_release_ids uuid[])
 returns table(release_id uuid,plays bigint)
 language sql stable security invoker set search_path=public,pg_temp
 as $$select p.release_id,count(*)::bigint as plays from public.music_play_sessions p
 where p.qualified_at is not null and p.release_id=any(p_release_ids)
 group by p.release_id$$;
revoke all on function public.public_release_play_counts(uuid[]) from public,anon,authenticated;
grant execute on function public.public_release_play_counts(uuid[]) to service_role;
