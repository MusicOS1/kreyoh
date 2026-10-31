-- FACKTS Billboard: additive measurement ledger. Apply ONLY after Session 4 release/audience migration.
-- Existing songs, audio keys, project records, and prior votes are neither copied nor rewritten.
create table if not exists public.music_play_sessions (
  id uuid primary key,
  release_id uuid not null references public.music_releases(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  listener_key text not null check (length(listener_key) between 10 and 110),
  source text not null default 'public-player' check (source in ('public-player','billboard','release')),
  duration_seconds integer not null check (duration_seconds between 3 and 14400),
  listened_seconds integer not null default 0 check (listened_seconds >= 0),
  started_at timestamptz not null default now(),
  qualified_at timestamptz,
  qualified_bucket bigint,
  check ((qualified_at is null and qualified_bucket is null) or (qualified_at is not null and qualified_bucket is not null))
);
create index if not exists music_play_sessions_release_date on public.music_play_sessions(release_id,qualified_at desc) where qualified_at is not null;
create index if not exists music_play_sessions_listener on public.music_play_sessions(listener_key,qualified_at desc);
create unique index if not exists music_play_unique_quarter_hour
  on public.music_play_sessions(release_id,listener_key,qualified_bucket) where qualified_bucket is not null;

create table if not exists public.music_release_likes (
  release_id uuid not null references public.music_releases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (release_id,user_id)
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

create table if not exists public.music_artist_follow_events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('follow','unfollow')),
  created_at timestamptz not null default now()
);
create index if not exists music_artist_follow_date on public.music_artist_follow_events(artist_id,created_at desc);

alter table public.music_play_sessions enable row level security;
alter table public.music_release_likes enable row level security;
alter table public.music_like_events enable row level security;
alter table public.music_artist_follow_events enable row level security;
-- No user-facing direct DML. All changes are checked and made by server routes.
revoke all on public.music_play_sessions,public.music_release_likes,public.music_like_events,public.music_artist_follow_events from public,anon,authenticated;
grant select,insert,update,delete on public.music_play_sessions,public.music_release_likes,public.music_like_events,public.music_artist_follow_events to service_role;

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
drop trigger if exists music_capture_like_change on public.music_release_likes;
create trigger music_capture_like_change after insert or delete on public.music_release_likes
 for each row execute function public.music_capture_like();

create or replace function public.music_capture_follow() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' and new.kind='following' then
   insert into public.music_artist_follow_events(artist_id,user_id,action) values(new.item_id,new.user_id,'follow');
 elsif tg_op='DELETE' and old.kind='following' then
   insert into public.music_artist_follow_events(artist_id,user_id,action) values(old.item_id,old.user_id,'unfollow');
 end if;
 return coalesce(new,old);
end $$;
drop trigger if exists music_capture_artist_follow on public.fan_music_library;
create trigger music_capture_artist_follow after insert or delete on public.fan_music_library
 for each row execute function public.music_capture_follow();

-- Period metrics use Kenya-local calendar dates. Score inputs are per-period, not lifetime popularity.
create or replace function public.billboard_metrics(p_from date,p_to date)
returns table (
 release_id uuid,plays bigint,unique_listeners bigint,likes bigint,period_likes bigint,
 followers bigint,follower_growth bigint,votes bigint,chart_score numeric
) language sql stable security invoker set search_path=public,pg_temp as $$
 with bounds as (
  select (p_from::timestamp at time zone 'Africa/Nairobi') as start_at,
         ((p_to+1)::timestamp at time zone 'Africa/Nairobi') as end_at
 ),
 p as (
  select x.release_id,count(*)::bigint plays,count(distinct x.listener_key)::bigint unique_listeners
  from public.music_play_sessions x cross join bounds b
  where x.qualified_at>=b.start_at and x.qualified_at<b.end_at
  group by x.release_id
 ),
 l as (
  select x.release_id,count(*)::bigint likes,
         count(*) filter(where x.created_at>=b.start_at and x.created_at<b.end_at)::bigint period_likes
  from public.music_release_likes x cross join bounds b group by x.release_id
 ),
 f as (
  select x.item_id artist_id,count(*)::bigint followers from public.fan_music_library x
  where x.kind='following' group by x.item_id
 ),
 fg as (
  select x.artist_id,coalesce(sum(case when x.action='follow' then 1 else -1 end),0)::bigint follower_growth
  from public.music_artist_follow_events x cross join bounds b
  where x.created_at>=b.start_at and x.created_at<b.end_at group by x.artist_id
 ),
 v as (
  select x.release_id,count(*)::bigint votes from public.music_votes x cross join bounds b
  where x.created_at>=b.start_at and x.created_at<b.end_at group by x.release_id
 ),
 stats as (
  select r.id release_id,coalesce(p.plays,0)::bigint plays,coalesce(p.unique_listeners,0)::bigint unique_listeners,
         coalesce(l.likes,0)::bigint likes,coalesce(l.period_likes,0)::bigint period_likes,
         coalesce(f.followers,0)::bigint followers,coalesce(fg.follower_growth,0)::bigint follower_growth,
         coalesce(v.votes,0)::bigint votes
  from public.music_releases r left join p on p.release_id=r.id
  left join l on l.release_id=r.id left join f on f.artist_id=r.artist_id
  left join fg on fg.artist_id=r.artist_id left join v on v.release_id=r.id
  where public.release_public_eligible(r.id)
 )
 select s.release_id,s.plays,s.unique_listeners,s.likes,s.period_likes,s.followers,s.follower_growth,s.votes,
 round(100*(
  coalesce(.50*s.plays::numeric/nullif(max(s.plays) over(),0),0)+
  coalesce(.25*s.period_likes::numeric/nullif(max(s.period_likes) over(),0),0)+
  coalesce(.15*greatest(s.follower_growth,0)::numeric/nullif(max(greatest(s.follower_growth,0)) over(),0),0)+
  coalesce(.10*s.votes::numeric/nullif(max(s.votes) over(),0),0)
 ),2) chart_score
 from stats s;
$$;
revoke all on function public.billboard_metrics(date,date) from public,anon,authenticated;
grant execute on function public.billboard_metrics(date,date) to service_role;
revoke all on function public.music_capture_like(), public.music_capture_follow() from public,anon,authenticated;

-- Preserve the exact column order and existing Session 4 artist-link columns before appending metrics.
create or replace view public.music_weekly_chart with(security_invoker=true) as
select r.id,r.artist_id,r.title,r.artist_name,r.collection,r.track_number,r.genre,r.description,r.credits,
 r.explicit,r.debut,r.release_at,r.created_at,(r.cover_key is not null) as has_cover,
 coalesce(m.votes,0)::integer as votes,(r.source_track_id is not null) as explicit_artist_link,r.featured_artist_ids,r.release_type,
 coalesce(m.plays,0)::bigint as plays,coalesce(m.unique_listeners,0)::bigint as unique_listeners,
 coalesce(m.likes,0)::bigint as likes,coalesce(m.period_likes,0)::bigint as new_likes,
 coalesce(m.followers,0)::bigint as followers,coalesce(m.follower_growth,0)::bigint as follower_growth,
 coalesce(m.chart_score,0)::numeric as chart_score
from public.music_releases r
left join public.billboard_metrics(date_trunc('week',now() at time zone 'Africa/Nairobi')::date,
 date_trunc('week',now() at time zone 'Africa/Nairobi')::date+6) m on m.release_id=r.id
where public.release_public_eligible(r.id);
revoke all on public.music_weekly_chart from public,anon,authenticated;
grant select on public.music_weekly_chart to service_role;

-- Current followers (11 before rollout) remain real; no invented historic follow, like or play events.

-- Extend existing artist-level release analytics without replacing prior saves/votes/comments.
create or replace function public.release_engagement(p_actor uuid,p_release uuid) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare r music_releases%rowtype; week date;
begin
 select * into strict r from music_releases where id=p_release;
 if not exists(select 1 from profiles where id=p_actor and account_status='active') or not (
  exists(select 1 from control_room_admins where user_id=p_actor and active and (permissions @> array['all']::text[] or permissions @> array['music']::text[])) or
  exists(select 1 from project_members where project_id=r.source_project_id and user_id=p_actor and status='active') and (p_actor in (r.artist_id,r.submitted_by) or production_has_role(r.source_project_id,p_actor,array['Super Admin','Admin','Project Lead','A&R','Manager']))
 ) then raise exception 'Release analytics access required.';end if;
 week:=date_trunc('week',now() at time zone 'Africa/Nairobi')::date;
 return jsonb_build_object(
  'published_releases',(select count(*) from music_releases x where x.artist_id=r.artist_id and release_public_eligible(x.id)),
  'followers',(select count(*) from fan_music_library where kind='following' and item_id=r.artist_id),
  'saves',(select count(*) from fan_music_library where kind='saved' and item_id=r.id),
  'eligible_weekly_votes',(select count(*) from music_votes where release_id=r.id and week_start=week and release_public_eligible(r.id)),
  'comments',(select count(*) from music_release_comments where release_id=r.id and deleted_at is null),
  'qualified_plays_this_week',(select count(*) from music_play_sessions where release_id=r.id and qualified_at>=week::timestamp at time zone 'Africa/Nairobi'),
  'unique_listeners_this_week',(select count(distinct listener_key) from music_play_sessions where release_id=r.id and qualified_at>=week::timestamp at time zone 'Africa/Nairobi'),
  'likes',(select count(*) from music_release_likes where release_id=r.id),
  'follower_growth_this_week',(select coalesce(sum(case when action='follow' then 1 else -1 end),0) from music_artist_follow_events where artist_id=r.artist_id and created_at>=week::timestamp at time zone 'Africa/Nairobi'),
  'billboard_score',(select chart_score from billboard_metrics(week,week+6) where release_id=r.id)
 );
end $$;
revoke all on function public.release_engagement(uuid,uuid) from public,anon,authenticated;
grant execute on function public.release_engagement(uuid,uuid) to service_role;
