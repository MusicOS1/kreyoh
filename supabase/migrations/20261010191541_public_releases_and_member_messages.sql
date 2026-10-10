-- Release copies and messages are separate from private project assets.
create table public.music_releases (
 id uuid primary key default gen_random_uuid(),
 artist_id uuid not null references public.profiles(id),
 title text not null check(length(trim(title)) between 1 and 120),
 artist_name text not null check(length(trim(artist_name)) between 1 and 100),
 collection text not null default '' check(length(collection)<=120),
 track_number integer not null default 1 check(track_number between 1 and 100),
 genre text not null default '' check(length(genre)<=60),
 description text not null default '' check(length(description)<=2000),
 credits text not null default '' check(length(credits)<=2000),
 explicit boolean not null default false,
 debut boolean not null default true,
 release_at timestamptz not null default now(),
 audio_key text not null unique,
 audio_type text not null check(audio_type in ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/flac')),
 cover_key text unique,
 status text not null default 'draft' check(status in ('draft','pending','published','rejected','withdrawn')),
 rights_confirmed_at timestamptz,
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id),
 review_note text not null default '' check(length(review_note)<=1000),
 created_at timestamptz not null default now(),
 check(status not in ('pending','published') or rights_confirmed_at is not null)
);
create index music_releases_artist_idx on public.music_releases(artist_id,created_at desc);
create index music_releases_public_idx on public.music_releases(status,release_at desc);
create table public.music_votes (
 release_id uuid not null references public.music_releases(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 week_start date not null,
 created_at timestamptz not null default now(),
 primary key(release_id,user_id,week_start)
);
create index music_votes_week_idx on public.music_votes(week_start,release_id);
create index music_votes_user_idx on public.music_votes(user_id,week_start);
create table public.member_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id),
 recipient_id uuid not null references public.profiles(id),
 body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check(sender_id<>recipient_id)
);
create index member_messages_sender_idx on public.member_messages(sender_id,recipient_id,created_at desc);
create index member_messages_recipient_idx on public.member_messages(recipient_id,sender_id,created_at desc);
create table public.member_blocks (
 blocker_id uuid not null references public.profiles(id),
 blocked_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create index member_blocks_target_idx on public.member_blocks(blocked_id);
-- Verified email is enforced by communityAccount() before invoking service-only RPCs.
-- Access is mediated by authenticated server actions; no direct browser table access.
alter table public.music_releases enable row level security;
alter table public.music_votes enable row level security;
alter table public.member_messages enable row level security;
alter table public.member_blocks enable row level security;
revoke all on public.music_releases,public.music_votes,public.member_messages,public.member_blocks from anon,authenticated;
grant all on public.music_releases,public.music_votes,public.member_messages,public.member_blocks to service_role;

create view public.music_weekly_chart with(security_invoker=true) as
select r.id,r.artist_id,r.title,r.artist_name,r.collection,r.track_number,r.genre,r.description,r.credits,r.explicit,r.debut,r.release_at,r.created_at,(r.cover_key is not null) as has_cover,
 count(v.user_id)::integer as votes
from public.music_releases r left join public.music_votes v on v.release_id=r.id
 and v.week_start=date_trunc('week',now() at time zone 'Africa/Nairobi')::date
where r.status='published' and r.release_at<=now()
group by r.id;
revoke all on public.music_weekly_chart from anon,authenticated;
grant select on public.music_weekly_chart to service_role;

create function public.set_music_vote(p_user uuid,p_release uuid,p_vote boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 if not exists(select 1 from public.profiles p where p.id=p_user and p.account_status='active') then raise exception 'Active account required.'; end if;
 select artist_id into owner_id from public.music_releases where id=p_release and status='published' and release_at<=now() for share;
 if owner_id is null then raise exception 'This release is not available.'; end if;
 if owner_id=p_user then raise exception 'Support other artists; you cannot vote for your own release.'; end if;
 if p_vote then
 insert into public.music_votes(release_id,user_id,week_start) values(p_release,p_user,date_trunc('week',now() at time zone 'Africa/Nairobi')::date) on conflict do nothing;
 else
 delete from public.music_votes where release_id=p_release and user_id=p_user and week_start=date_trunc('week',now() at time zone 'Africa/Nairobi')::date;
 end if;
end $$;
revoke all on function public.set_music_vote(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_music_vote(uuid,uuid,boolean) to service_role;

create function public.send_member_message(p_sender uuid,p_recipient uuid,p_body text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare message_id uuid;
begin
 if p_sender=p_recipient or length(trim(p_body)) not between 1 and 2000 then raise exception 'Write a message of 1 to 2,000 characters to another member.'; end if;
 -- Serialise both sides, including simultaneous block and send operations.
 perform pg_advisory_xact_lock(hashtextextended(least(p_sender,p_recipient)::text,0));
 perform pg_advisory_xact_lock(hashtextextended(greatest(p_sender,p_recipient)::text,0));
 if not exists(select 1 from public.profiles p where p.id=p_sender and p.account_status='active') then raise exception 'Active account required.'; end if;
 if not exists(select 1 from public.profiles where id=p_recipient and account_status='active') then raise exception 'This member is unavailable.'; end if;
 if exists(select 1 from public.member_blocks where (blocker_id=p_sender and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=p_sender)) then raise exception 'Messaging is unavailable for this conversation.'; end if;
 if not (
 exists(select 1 from public.profiles where id=p_recipient and profile_visibility='public')
 or exists(select 1 from public.music_releases where artist_id=p_recipient and status='published' and release_at<=now())
 or exists(select 1 from public.project_members a join public.project_members b on a.project_id=b.project_id where a.user_id=p_sender and b.user_id=p_recipient and a.status='active' and b.status='active')
 or exists(select 1 from public.member_messages where sender_id=p_recipient and recipient_id=p_sender)
 ) then raise exception 'Choose a public creator or someone in your projects.'; end if;
 if (select count(*) from public.member_messages where sender_id=p_sender and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait a minute before sending more messages.'; end if;
 if (select count(*) from public.member_messages where sender_id=p_sender and created_at>now()-interval '1 day')>=200 then raise exception 'Daily messaging limit reached. Please try tomorrow.'; end if;
 insert into public.member_messages(sender_id,recipient_id,body) values(p_sender,p_recipient,trim(p_body)) returning id into message_id;
 return message_id;
end $$;
revoke all on function public.send_member_message(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.send_member_message(uuid,uuid,text) to service_role;

create function public.set_member_block(p_user uuid,p_other uuid,p_block boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_user=p_other then raise exception 'Choose another member.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(least(p_user,p_other)::text,0));
 perform pg_advisory_xact_lock(hashtextextended(greatest(p_user,p_other)::text,0));
 if p_block then insert into public.member_blocks(blocker_id,blocked_id) values(p_user,p_other) on conflict do nothing;
 else delete from public.member_blocks where blocker_id=p_user and blocked_id=p_other; end if;
end $$;
revoke all on function public.set_member_block(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_member_block(uuid,uuid,boolean) to service_role;
