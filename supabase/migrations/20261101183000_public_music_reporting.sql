-- Additive public listening reporting. Requires 20261101172500_public_qualified_plays_independent.sql.
-- Same functions already installed on the connected reporting database.
create or replace function public.public_music_play_stats(p_from date,p_to date)
returns table(release_id uuid,lifetime_plays bigint,period_plays bigint,lifetime_listeners bigint,period_listeners bigint,lifetime_starts bigint,period_starts bigint,last_play_at timestamptz)
language sql stable security invoker set search_path=public,pg_temp as $$
with b as (select p_from::timestamp at time zone 'Africa/Nairobi' since_at,((p_to+1)::timestamp at time zone 'Africa/Nairobi') before_at)
select r.id,count(p.qualified_at)::bigint,
 count(p.qualified_at) filter(where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint,
 count(distinct p.listener_key) filter(where p.qualified_at is not null)::bigint,
 count(distinct p.listener_key) filter(where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint,
 count(p.id)::bigint,
 count(p.id) filter(where p.started_at>=b.since_at and p.started_at<b.before_at)::bigint,
 max(p.qualified_at)
from public.music_releases r cross join b left join public.music_play_sessions p on p.release_id=r.id
where r.status='published' and r.release_at<=now() group by r.id
$$;
revoke all on function public.public_music_play_stats(date,date) from public,anon,authenticated;
grant execute on function public.public_music_play_stats(date,date) to service_role;

create or replace function public.public_music_daily_plays(p_from date,p_to date)
returns table(day date,plays bigint,unique_listeners bigint,starts bigint)
language sql stable security invoker set search_path=public,pg_temp as $$
with days as (select generate_series(p_from,p_to,'1 day'::interval)::date day),
live as (select id from public.music_releases where status='published' and release_at<=now()),
b as (select (p.qualified_at at time zone 'Africa/Nairobi')::date day,count(*)::bigint plays,count(distinct p.listener_key)::bigint unique_listeners
 from public.music_play_sessions p join live on live.id=p.release_id
 where p.qualified_at>=(p_from::timestamp at time zone 'Africa/Nairobi')
 and p.qualified_at<((p_to+1)::timestamp at time zone 'Africa/Nairobi') group by 1),
s as (select (p.started_at at time zone 'Africa/Nairobi')::date day,count(*)::bigint starts
 from public.music_play_sessions p join live on live.id=p.release_id
 where p.started_at>=(p_from::timestamp at time zone 'Africa/Nairobi')
 and p.started_at<((p_to+1)::timestamp at time zone 'Africa/Nairobi') group by 1)
select days.day,coalesce(b.plays,0),coalesce(b.unique_listeners,0),coalesce(s.starts,0) from days left join b using(day) left join s using(day) order by days.day
$$;
revoke all on function public.public_music_daily_plays(date,date) from public,anon,authenticated;
grant execute on function public.public_music_daily_plays(date,date) to service_role;

create or replace function public.public_music_artist_audience(p_from date,p_to date)
returns table(credited_artist text,lifetime_plays bigint,period_plays bigint,lifetime_listeners bigint,period_listeners bigint,lifetime_starts bigint,period_starts bigint,songs bigint)
language sql stable security invoker set search_path=public,pg_temp as $$
with b as (select p_from::timestamp at time zone 'Africa/Nairobi' since_at,((p_to+1)::timestamp at time zone 'Africa/Nairobi') before_at)
select r.artist_name,
 count(p.qualified_at)::bigint,
 count(p.qualified_at) filter(where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint,
 count(distinct p.listener_key) filter(where p.qualified_at is not null)::bigint,
 count(distinct p.listener_key) filter(where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint,
 count(p.id)::bigint,
 count(p.id) filter(where p.started_at>=b.since_at and p.started_at<b.before_at)::bigint,
 count(distinct r.id)::bigint
from public.music_releases r cross join b left join public.music_play_sessions p on p.release_id=r.id
where r.status='published' and r.release_at<=now() group by r.artist_name
$$;
revoke all on function public.public_music_artist_audience(date,date) from public,anon,authenticated;
grant execute on function public.public_music_artist_audience(date,date) to service_role;

create or replace function public.public_music_platform_audience(p_from date,p_to date)
returns table(lifetime_listeners bigint,period_listeners bigint)
language sql stable security invoker set search_path=public,pg_temp as $$
with b as (select p_from::timestamp at time zone 'Africa/Nairobi' since_at,((p_to+1)::timestamp at time zone 'Africa/Nairobi') before_at)
select count(distinct p.listener_key) filter(where p.qualified_at is not null)::bigint,
 count(distinct p.listener_key) filter(where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint
from public.music_play_sessions p join public.music_releases r on r.id=p.release_id cross join b
where r.status='published' and r.release_at<=now()
$$;
revoke all on function public.public_music_platform_audience(date,date) from public,anon,authenticated;
grant execute on function public.public_music_platform_audience(date,date) to service_role;
