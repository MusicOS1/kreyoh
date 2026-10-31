-- Local/preview candidate only. No existing releases or creative records are rewritten.
alter table public.music_releases
 add column source_project_id uuid references public.projects(id),
 add column source_track_id uuid references public.tracks(id),
 add column source_master_id uuid references public.project_assets(id),
 add column source_cover_id uuid references public.project_assets(id),
 add column submitted_by uuid references public.profiles(id),
 add column featured_artist_ids uuid[] not null default '{}',
 add column release_type text not null default 'single' check(release_type in ('single','ep','album')),
 add column isrc text not null default '', add column upc text not null default '',
 add column workflow_state text check(workflow_state in ('draft','submitted','under_review','changes_requested','approved','scheduled','published','rejected','withdrawn')),
 add column revision integer not null default 0,
 add column release_permission text not null default '',
 add column artwork_authorised boolean not null default false,
 add column approved_fingerprint text,
 add column source_fingerprint text;
create unique index release_one_active_source on public.music_releases(source_track_id) where source_track_id is not null and status<>'withdrawn';
create table public.release_review_events(
 id uuid primary key, release_id uuid not null references public.music_releases(id),
 actor_id uuid not null references public.profiles(id), action text not null,
 revision integer not null, input jsonb not null, result jsonb not null,
 note text not null default '', created_at timestamptz not null default now()
);
alter table public.release_review_events enable row level security;
revoke all on public.release_review_events from public,anon,authenticated;
grant all on public.release_review_events to service_role;
alter table public.project_tasks add column release_id uuid references public.music_releases(id);
create unique index release_campaign_task on public.project_tasks(release_id,title) where release_id is not null;

create function public.release_requirements(p_release uuid) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare r music_releases%rowtype; ready jsonb; checks jsonb; fp text;
begin
 select * into strict r from music_releases where id=p_release;
 if r.source_track_id is null then return jsonb_build_object('legacy',true,'complete',r.rights_confirmed_at is not null);end if;
 ready:=production_readiness(r.source_track_id);
 checks:=jsonb_build_object(
 'production',ready->>'state'='Ready' and ready->>'master_id'=r.source_master_id::text,
 'approved_master',exists(select 1 from project_assets a where a.id=r.source_master_id and a.entity_id=r.source_track_id and a.project_id=r.source_project_id and a.asset_kind='master' and a.review_status='approved' and a.bucket_id='r2' and a.visibility in ('project','public') and a.mime_type in ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/flac')),
 'metadata',length(trim(r.title))>0 and length(trim(r.genre))>0 and (r.release_type='single' or length(trim(r.collection))>0),
 'recording_artist',exists(select 1 from track_contributors c join project_members m on m.project_id=r.source_project_id and m.user_id=c.user_id and m.status='active' where c.track_id=r.source_track_id and c.user_id=r.artist_id and c.approved and lower(replace(c.contribution_role,' ','_')) in ('artist','primary_artist','recording_artist','lead_artist')),
 'featured_artists',not exists(select 1 from unnest(r.featured_artist_ids) f where f=r.artist_id or not exists(select 1 from track_contributors c join project_members m on m.project_id=r.source_project_id and m.user_id=c.user_id and m.status='active' where c.track_id=r.source_track_id and c.user_id=f and c.approved and lower(replace(c.contribution_role,' ','_')) in ('artist','primary_artist','recording_artist','lead_artist','featured_artist','featured','feature'))),
 'approved_artwork',r.artwork_authorised and exists(select 1 from project_assets a where a.id=r.source_cover_id and a.project_id=r.source_project_id and a.review_status='approved' and a.asset_kind='visual' and a.mime_type in ('image/jpeg','image/png','image/webp') and a.bucket_id='r2' and a.visibility in ('project','public')),
 'release_permission',length(trim(r.release_permission)) between 10 and 2000,
 'identifiers',(r.isrc='' or r.isrc~'^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$') and (r.upc='' or r.upc~'^[0-9]{12,13}$')
 );
 fp:=encode(sha256(convert_to(jsonb_build_object('production',ready->>'fingerprint','checks',checks,'title',r.title,'artist',r.artist_id,'artist_name',r.artist_name,'featured',r.featured_artist_ids,'genre',r.genre,'collection',r.collection,'type',r.release_type,'number',r.track_number,'description',r.description,'credits',r.credits,'explicit',r.explicit,'debut',r.debut,'date',r.release_at,'isrc',r.isrc,'upc',r.upc,'permission',r.release_permission,'cover',(select to_jsonb(a) from project_assets a where a.id=r.source_cover_id))::text,'UTF8')),'hex');
 return jsonb_build_object('checks',checks,'complete',not exists(select 1 from jsonb_each(checks) c where c.value is distinct from 'true'::jsonb),'fingerprint',fp,'source_fingerprint',ready->>'fingerprint');
end $$;
create function public.release_public_eligible(p_release uuid) returns boolean
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare r music_releases%rowtype; checks jsonb;
begin
 select * into r from music_releases where id=p_release;
 if not found or r.status<>'published' or r.release_at>now() then return false;end if;
 if r.source_track_id is null then return r.rights_confirmed_at is not null;end if;
 checks:=release_requirements(r.id);
 return coalesce((checks->>'complete')::boolean,false) and r.approved_fingerprint=checks->>'fingerprint' and r.workflow_state in ('scheduled','published');
end $$;

create function public.release_mutate(p_actor uuid,p_action text,p_release uuid,p_revision integer,p_data jsonb,p_request uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
#variable_conflict use_variable
<<workflow>>
declare r music_releases%rowtype; project_id uuid; track_id uuid; member boolean; editor boolean; reviewer boolean; ready jsonb; checks jsonb; result jsonb; name text; credits_text text; note text:=left(coalesce(p_data->>'note',''),1000); e release_review_events%rowtype; f uuid[]; new_state text; initial_artist uuid;
begin
 perform set_config('fackts.release_write','on',true);
 select source_project_id into project_id from music_releases where id=p_release;
 if p_action='create' then track_id:=(p_data->>'track_id')::uuid;select t.project_id into project_id from tracks t where t.id=track_id;end if;
 if project_id is null then raise exception 'Linked release not found.';end if;
 -- Same lock as production mutations: source approval cannot race release approval.
 perform pg_advisory_xact_lock(hashtextextended(project_id::text,391));
 if not exists(select 1 from profiles where id=p_actor and account_status='active') then raise exception 'Active account required.';end if;
 member:=exists(select 1 from project_members where project_members.project_id=workflow.project_id and user_id=p_actor and status='active');
 reviewer:=exists(select 1 from control_room_admins where user_id=p_actor and active and (permissions @> array['music']::text[] or permissions @> array['all']::text[]));
 if not member and not reviewer then raise exception 'Active project membership or music review permission required.';end if;
 select * into e from release_review_events where id=p_request;
 if found then
  if e.actor_id<>p_actor or e.release_id<>p_release or e.action<>p_action or e.input<>p_data then raise exception 'Request key belongs to another operation.';end if;
  return e.result;
 end if;
 if p_action='create' then
  editor:=member and (production_has_role(project_id,p_actor,array['Super Admin','Admin','Project Lead','A&R','Manager']) or exists(select 1 from track_contributors c where c.track_id=workflow.track_id and c.user_id=p_actor and c.approved and lower(replace(c.contribution_role,' ','_')) in ('artist','primary_artist','recording_artist','lead_artist')));
  if not editor then raise exception 'Your project role cannot prepare this release.';end if;
  select * into r from music_releases where source_track_id=track_id and status<>'withdrawn';
  if found then return jsonb_build_object('id',r.id,'revision',r.revision,'state',r.workflow_state);end if;
  select c.user_id into initial_artist from track_contributors c where c.track_id=workflow.track_id and c.approved and lower(replace(c.contribution_role,' ','_')) in ('artist','primary_artist','recording_artist','lead_artist') order by c.id limit 1;
  if initial_artist is null then raise exception 'Record and approve the recording artist before release preparation.';end if;
  ready:=production_readiness(track_id);
  insert into music_releases(id,source_project_id,source_track_id,source_master_id,submitted_by,artist_id,artist_name,title,audio_key,audio_type,workflow_state)
   select p_release,project_id,track_id,(ready->>'master_id')::uuid,p_actor,initial_artist,coalesce(nullif(p.stage_name,''),p.full_name),t.working_title,'releases/'||initial_artist||'/'||p_release||'/unsubmitted','audio/wav','draft' from tracks t join profiles p on p.id=initial_artist where t.id=track_id;
 else
  select * into strict r from music_releases where id=p_release for update;
  if r.revision<>p_revision then raise exception 'This release changed. Reload before continuing.';end if;
  editor:=member and (p_actor=r.submitted_by or p_actor=r.artist_id or production_has_role(project_id,p_actor,array['Super Admin','Admin','Project Lead','A&R','Manager']));
  if p_action in ('save','submit','campaign','withdraw') and not editor and not (p_action='withdraw' and reviewer) then raise exception 'Your project role cannot change this release.';end if;
  if p_action in ('review','changes_requested','approve','reject','publish') and not reviewer then raise exception 'Music release administrator permission required.';end if;
  if p_action='save' then
   if r.workflow_state not in ('draft','changes_requested','rejected','withdrawn') then raise exception 'Request changes or withdraw before editing submitted material.';end if;
   f:=array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p_data->'featured_artist_ids','[]')));
   select coalesce(nullif(stage_name,''),nullif(nickname,''),full_name) into name from profiles where id=(p_data->>'artist_id')::uuid;
   if name is null then raise exception 'Choose the recorded artist.';end if;
   select string_agg(coalesce(nullif(p.stage_name,''),p.full_name)||' ('||c.contribution_role||')',E'\n' order by c.id) into credits_text from track_contributors c join profiles p on p.id=c.user_id where c.track_id=r.source_track_id and c.approved;
   ready:=production_readiness(r.source_track_id);
   update music_releases set title=trim(p_data->>'title'),artist_id=(p_data->>'artist_id')::uuid,artist_name=name,featured_artist_ids=f,release_type=p_data->>'release_type',collection=coalesce(p_data->>'collection',''),genre=coalesce(p_data->>'genre',''),description=coalesce(p_data->>'description',''),credits=coalesce(credits_text,''),explicit=coalesce((p_data->>'explicit')::boolean,false),release_at=(p_data->>'release_at')::timestamptz,source_master_id=(ready->>'master_id')::uuid,source_cover_id=nullif(p_data->>'cover_id','')::uuid,release_permission=coalesce(p_data->>'release_permission',''),artwork_authorised=coalesce((p_data->>'artwork_authorised')::boolean,false),isrc=upper(coalesce(p_data->>'isrc','')),upc=coalesce(p_data->>'upc',''),status='draft',workflow_state='draft',approved_fingerprint=null,source_fingerprint=null,revision=revision+1,reviewed_at=null,reviewed_by=null where id=r.id;
  elsif p_action='submit' then
   if r.workflow_state not in ('draft','changes_requested') then raise exception 'Only a draft or requested revision can be submitted.';end if;
   checks:=release_requirements(r.id);
   if not (checks->>'complete')::boolean then raise exception 'Resolve release requirements: %',checks->'checks';end if;
   update music_releases set status='pending',workflow_state='submitted',source_fingerprint=checks->>'source_fingerprint',audio_key='releases/'||artist_id||'/'||id||'/v'||revision||'/audio',audio_type=(select mime_type from project_assets where id=r.source_master_id),cover_key='releases/'||artist_id||'/'||id||'/v'||revision||'/cover',submitted_at=now(),rights_confirmed_at=now(),approved_fingerprint=null,revision=revision+1 where id=r.id;
  elsif p_action in ('review','changes_requested','approve','reject','publish') then
   if p_action='review' and r.workflow_state<>'submitted' then raise exception 'Submitted release required.';end if;
   if p_action in ('changes_requested','reject','approve') and r.workflow_state not in ('submitted','under_review') then raise exception 'Release is not awaiting this review.';end if;
   if p_action in ('changes_requested','reject') and length(trim(note))=0 then raise exception 'Give the artist a review reason.';end if;
   checks:=release_requirements(r.id);
   if p_action in ('approve','publish') and (not (checks->>'complete')::boolean or r.source_fingerprint is distinct from checks->>'source_fingerprint') then raise exception 'Production or rights changed. Request changes and resubmit.';end if;
   if p_action='publish' then
    if r.workflow_state<>'approved' or r.approved_fingerprint is distinct from checks->>'fingerprint' then raise exception 'Current revision approval required.';end if;
    if exists(select 1 from unnest(array_prepend(r.artist_id,r.featured_artist_ids)) a where not exists(select 1 from profiles p where p.id=a and p.profile_visibility='public' and p.account_status='active')) then raise exception 'Primary and featured artists need active public profiles before publication.';end if;
   end if;
   new_state:=case p_action when 'review' then 'under_review' when 'approve' then 'approved' when 'reject' then 'rejected' when 'publish' then case when r.release_at>now() then 'scheduled' else 'published' end else p_action end;
   update music_releases set workflow_state=new_state,status=case when p_action='publish' then 'published' when p_action='reject' then 'rejected' when p_action='changes_requested' then 'draft' else 'pending' end,approved_fingerprint=case when p_action in ('approve','publish') then checks->>'fingerprint' else null end,reviewed_by=p_actor,reviewed_at=now(),review_note=note,revision=revision+1 where id=r.id;
  elsif p_action='withdraw' then
   update music_releases set status='withdrawn',workflow_state='withdrawn',approved_fingerprint=null,review_note=note,revision=revision+1 where id=r.id;
  elsif p_action='campaign' then
   insert into project_tasks(project_id,release_id,title,assignee_id,created_by,status) select project_id,r.id,title,p_actor,p_actor,'to_do' from unnest(array['Final artwork approved','Release information confirmed','Artist profile updated','Release date agreed','Promotional materials ready','Announcement prepared','Launch published','Post-release review completed']) title on conflict(release_id,title) where release_id is not null do nothing;
  else raise exception 'Unknown release action.';end if;
 end if;
 select jsonb_build_object('id',id,'revision',revision,'state',workflow_state) into result from music_releases where id=p_release;
 insert into release_review_events(id,release_id,actor_id,action,revision,input,result,note)values(p_request,p_release,p_actor,p_action,(result->>'revision')::integer,p_data,result,note);
 insert into activity_log(project_id,user_id,action,entity_type,entity_id)values(project_id,p_actor,'release_'||p_action,'release',p_release);
 if p_action in ('changes_requested','approve','reject','publish') then
  insert into notifications(user_id,project_id,type,title,body,entity_type,entity_id)select distinct person,project_id,'release_'||p_action,'Release '||new_state,note,'release',p_release from unnest(array[r.submitted_by,r.artist_id]) person where person is not null and person<>p_actor;
 end if;
 if p_action='publish' and new_state='published' then
  insert into notifications(user_id,type,title,body,entity_type,entity_id)
  select distinct f.user_id,'public_release_published','New release',r.title,'public_release',r.id
  from fan_music_library f where f.kind='following' and f.item_id=any(array_prepend(r.artist_id,r.featured_artist_ids)) and f.user_id<>p_actor
  and not exists(select 1 from notifications n where n.user_id=f.user_id and n.type='public_release_published' and n.entity_id=r.id);
 end if;
 return result;
end $$;
-- Prevent older generic metadata/review paths from bypassing linked-release revisioning.
create function public.guard_linked_release() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if (old.source_track_id is not null or new.source_track_id is not null) and current_setting('fackts.release_write',true) is distinct from 'on' then raise exception 'Use the linked release workflow to change this release.';end if;
 return new;
end $$;
-- Only the server-owned workflow RPC sets this transaction-local flag.
create trigger linked_release_guard before update on public.music_releases for each row execute function public.guard_linked_release();
create or replace view public.music_weekly_chart with(security_invoker=true) as
select r.id,r.artist_id,r.title,r.artist_name,r.collection,r.track_number,r.genre,r.description,r.credits,r.explicit,r.debut,r.release_at,r.created_at,(r.cover_key is not null) as has_cover,
 count(v.user_id)::integer as votes,(r.source_track_id is not null) as explicit_artist_link,r.featured_artist_ids,r.release_type
from public.music_releases r left join public.music_votes v on v.release_id=r.id and v.week_start=date_trunc('week',now() at time zone 'Africa/Nairobi')::date
where public.release_public_eligible(r.id) group by r.id;
revoke all on public.music_weekly_chart from public,anon,authenticated;
grant select on public.music_weekly_chart to service_role;
revoke all on function public.release_requirements(uuid),public.release_public_eligible(uuid),public.release_mutate(uuid,text,uuid,integer,jsonb,uuid),public.guard_linked_release() from public,anon,authenticated;
grant execute on function public.release_requirements(uuid),public.release_public_eligible(uuid),public.release_mutate(uuid,text,uuid,integer,jsonb,uuid) to service_role;

create function public.release_engagement(p_actor uuid,p_release uuid) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare r music_releases%rowtype;
begin
 select * into strict r from music_releases where id=p_release;
 if not exists(select 1 from profiles where id=p_actor and account_status='active') or not (
  exists(select 1 from control_room_admins where user_id=p_actor and active and (permissions @> array['all']::text[] or permissions @> array['music']::text[])) or
  exists(select 1 from project_members where project_id=r.source_project_id and user_id=p_actor and status='active') and (p_actor in (r.artist_id,r.submitted_by) or production_has_role(r.source_project_id,p_actor,array['Super Admin','Admin','Project Lead','A&R','Manager']))
 ) then raise exception 'Release analytics access required.';end if;
 return jsonb_build_object('published_releases',(select count(*) from music_releases x where x.artist_id=r.artist_id and release_public_eligible(x.id)),
 'followers',(select count(*) from fan_music_library where kind='following' and item_id=r.artist_id),
 'saves',(select count(*) from fan_music_library where kind='saved' and item_id=r.id),
 'eligible_weekly_votes',(select count(*) from music_votes where release_id=r.id and week_start=date_trunc('week',now() at time zone 'Africa/Nairobi')::date and release_public_eligible(r.id)),
 'comments',(select count(*) from music_release_comments where release_id=r.id and deleted_at is null));
end $$;
revoke all on function public.release_engagement(uuid,uuid) from public,anon,authenticated;
grant execute on function public.release_engagement(uuid,uuid) to service_role;
create or replace function public.set_music_vote(p_user uuid,p_release uuid,p_vote boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 if not exists(select 1 from public.profiles p where p.id=p_user and p.account_status='active') then raise exception 'Active account required.';end if;
 select artist_id into owner_id from public.music_releases where id=p_release for share;
 if owner_id is null or not public.release_public_eligible(p_release) then raise exception 'This release is not available.';end if;
 if owner_id=p_user or exists(select 1 from public.music_releases where id=p_release and p_user=any(featured_artist_ids)) then raise exception 'Support other artists; you cannot vote for your own release.';end if;
 if p_vote then insert into public.music_votes(release_id,user_id,week_start) values(p_release,p_user,date_trunc('week',now() at time zone 'Africa/Nairobi')::date) on conflict do nothing;
 else delete from public.music_votes where release_id=p_release and user_id=p_user and week_start=date_trunc('week',now() at time zone 'Africa/Nairobi')::date;end if;
end $$;
revoke all on function public.set_music_vote(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_music_vote(uuid,uuid,boolean) to service_role;

create function public.add_release_to_playlist(p_user uuid,p_playlist uuid,p_release uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare ids uuid[];
begin
 if not exists(select 1 from profiles where id=p_user and account_status='active') or not release_public_eligible(p_release) then raise exception 'This public song is unavailable.';end if;
 select track_ids into ids from fan_music_library where user_id=p_user and kind='playlist' and item_id=p_playlist for update;
 if not found then raise exception 'Choose one of your existing playlists.';end if;
 if not p_release=any(ids) then ids:=array_append(ids,p_release);end if;
 if cardinality(ids)>200 then raise exception 'Playlists support up to 200 songs.';end if;
 update fan_music_library set track_ids=ids,updated_at=now() where user_id=p_user and kind='playlist' and item_id=p_playlist;
end $$;
revoke all on function public.add_release_to_playlist(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.add_release_to_playlist(uuid,uuid,uuid) to service_role;
