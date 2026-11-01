-- Additive timestamp support for public fan comments. Existing comments remain intact.
-- Apply to the existing public comments table after backup/review; no rewrite or backfill.
alter table public.music_release_comments add column if not exists position_seconds integer
  check (position_seconds is null or position_seconds between 0 and 14400);
create index if not exists music_comments_timed_release
 on public.music_release_comments(release_id,position_seconds)
 where position_seconds is not null and deleted_at is null;
