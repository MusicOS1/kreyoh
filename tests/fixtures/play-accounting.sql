-- Isolated test fixture from the deployed telemetry schema. Contains no user records.
create table music_play_sessions (
  id uuid not null,
  release_id uuid not null,
  user_id uuid,
  listener_key text not null,
  source text default 'public-player'::text not null,
  duration_seconds integer not null,
  listened_seconds integer default 0 not null,
  started_at timestamp with time zone default now() not null,
  qualified_at timestamp with time zone,
  qualified_bucket bigint,
  CHECK ((((qualified_at IS NULL) AND (qualified_bucket IS NULL)) OR ((qualified_at IS NOT NULL) AND (qualified_bucket IS NOT NULL)))),
  CHECK (((duration_seconds >= 3) AND (duration_seconds <= 14400))),
  CHECK ((listened_seconds >= 0)),
  CHECK (((length(listener_key) >= 10) AND (length(listener_key) <= 110))),
  PRIMARY KEY (id),
  FOREIGN KEY (release_id) REFERENCES music_releases(id) ON DELETE CASCADE,
  CHECK ((source = ANY (ARRAY['public-player'::text, 'billboard'::text, 'release'::text]))),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX music_play_sessions_release_date ON public.music_play_sessions USING btree (release_id, qualified_at DESC) WHERE (qualified_at IS NOT NULL);
CREATE INDEX music_play_sessions_listener ON public.music_play_sessions USING btree (listener_key, qualified_at DESC);
CREATE UNIQUE INDEX music_play_unique_quarter_hour ON public.music_play_sessions USING btree (release_id, listener_key, qualified_bucket) WHERE (qualified_bucket IS NOT NULL);
CREATE OR REPLACE FUNCTION public.public_music_play_stats(p_from date, p_to date)
 RETURNS TABLE(release_id uuid, lifetime_plays bigint, period_plays bigint, lifetime_listeners bigint, period_listeners bigint, lifetime_starts bigint, period_starts bigint, last_play_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
with bounds as (
 select (p_from::timestamp at time zone 'Africa/Nairobi') as since_at,
        ((p_to+1)::timestamp at time zone 'Africa/Nairobi') as before_at
),
valid_releases as (
 select id from public.music_releases where status='published' and release_at<=now()
)
select r.id as release_id,
       count(p.qualified_at)::bigint as lifetime_plays,
       count(p.qualified_at) filter (where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint as period_plays,
       count(distinct p.listener_key) filter (where p.qualified_at is not null)::bigint as lifetime_listeners,
       count(distinct p.listener_key) filter (where p.qualified_at>=b.since_at and p.qualified_at<b.before_at)::bigint as period_listeners,
       count(p.id)::bigint as lifetime_starts,
       count(p.id) filter (where p.started_at>=b.since_at and p.started_at<b.before_at)::bigint as period_starts,
       max(p.qualified_at) as last_play_at
from valid_releases r
cross join bounds b
left join public.music_play_sessions p on p.release_id=r.id
group by r.id;
$function$
;
CREATE OR REPLACE FUNCTION public.public_release_play_counts(p_release_ids uuid[])
 RETURNS TABLE(release_id uuid, plays bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select p.release_id,count(*)::bigint as plays
 from public.music_play_sessions p
 where p.qualified_at is not null and p.release_id=any(p_release_ids)
 group by p.release_id
$function$
;
