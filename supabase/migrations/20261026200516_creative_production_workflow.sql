-- Preview candidate only. Apply to an isolated database before any owner-approved shared rollout.
-- Existing assets are deliberately NOT approved or republished by this migration.
alter table public.project_assets
  add column if not exists review_status text not null default 'in_progress' check(review_status in ('in_progress','submitted','changes_requested','approved')),
  add column if not exists review_revision integer not null default 0,
  add column if not exists review_assignee uuid references public.profiles(id),
  add column if not exists review_task_id uuid references public.project_tasks(id) on delete set null,
  add column if not exists byte_size bigint,
  add column if not exists storage_etag text;
alter table public.tracks add column if not exists production_signoff jsonb;
alter table public.session_participants
  add column if not exists attendance text not null default 'unrecorded' check(attendance in ('unrecorded','attended','absent','excused')),
  add column if not exists attendance_recorded_by uuid references public.profiles(id),
  add column if not exists attendance_recorded_at timestamptz;

-- A transfer ledger, not a second asset catalogue. No asset exists until verified completion.
create table public.production_uploads (
 id uuid primary key,
 project_id uuid not null references public.projects(id) on delete cascade,
 track_id uuid not null references public.tracks(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 storage_key text not null unique,
 final_key text not null unique,
 upload_id text,
 file_name text not null,
 mime_type text not null,
 byte_size bigint not null check(byte_size > 0 and byte_size <= 21474836480),
 asset_kind text not null check(asset_kind in ('demo','rough_mix','mix','master','stems','reference','document','visual')),
 version_note text,
 status text not null default 'uploading' check(status in ('uploading','completed','aborted')),
 asset_id uuid references public.project_assets(id) on delete set null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.production_uploads enable row level security;
revoke all on public.production_uploads from public,anon,authenticated;
grant select,insert,update on public.production_uploads to service_role;
create index production_uploads_asset_idx on public.production_uploads(asset_id) where asset_id is not null;
create index production_uploads_owner_idx on public.production_uploads(user_id,status,expires_at);
create index if not exists production_review_history_idx on public.platform_events(project_id,entity_type,entity_id,created_at desc,id desc);
create index if not exists production_assets_track_idx on public.project_assets(project_id,entity_type,entity_id,created_at desc);

-- These public helpers are SECURITY INVOKER. Only the authenticated application server may call them.
-- p_actor is always obtained from getUser(), never from form data.
create function public.production_has_role(p_project uuid,p_actor uuid,p_roles text[])
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.project_members m join public.member_roles mr on mr.project_member_id=m.id
 join public.roles r on r.id=mr.role_id where m.project_id=p_project and m.user_id=p_actor and m.status='active' and r.name=any(p_roles));
$$;

create function public.production_readiness(p_track uuid)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare t public.tracks%rowtype; a public.project_assets%rowtype; checks jsonb; snapshot jsonb; fp text; ok boolean; blocked boolean;
begin
 select * into strict t from public.tracks where id=p_track;
 select * into a from public.project_assets where entity_type='track' and entity_id=t.id and project_id=t.project_id and asset_kind='master' order by created_at desc,id desc limit 1;
 checks:=jsonb_build_object(
 'final_master',coalesce(a.review_status='approved',false),
 'metadata',length(trim(coalesce(t.working_title,'')))>0 and length(trim(coalesce(t.track_code,'')))>0,
 'artwork',length(coalesce(nullif(trim(t.artwork_url),''),nullif(trim(t.artwork_storage_key),''),''))>0,
 'credits',exists(select 1 from public.track_contributors where track_id=t.id) and not exists(select 1 from public.track_contributors c where c.track_id=t.id and (not c.approved or not exists(select 1 from public.project_members m where m.project_id=t.project_id and m.user_id=c.user_id and m.status='active'))),
 'splits',exists(select 1 from public.track_split_plans where track_id=t.id and status='confirmed') and coalesce((select sum(percentage)=100 and bool_and(status='confirmed') from public.track_splits where track_id=t.id),false),
 'agreements',not exists(select 1 from unnest(array['producer_agreement','beat_rights','songwriter_credits','samples_cleared','performer_approvals','master_ownership']) k where not exists(select 1 from public.track_rights_checks c where c.track_id=t.id and c.check_key=k and c.status in ('clear','not_applicable') and length(trim(coalesce(c.evidence_note,'')))>0)),
 'visual_requirements',not exists(select 1 from public.track_rights_checks c where c.track_id=t.id and c.check_key='visual_assets' and (length(trim(coalesce(c.evidence_note,'')))=0 or c.status not in ('clear','not_applicable') or c.status='clear' and coalesce((select v.review_status from public.project_assets v where v.entity_type='track' and v.project_id=t.project_id and v.entity_id=t.id and v.asset_kind='visual' order by v.created_at desc,v.id desc limit 1),'')<>'approved')),
 'tasks',not exists(select 1 from public.project_tasks where project_id=t.project_id and track_id=t.id and status<>'done'),
 'issues',not exists(select 1 from public.track_operational_issues where project_id=t.project_id and track_id=t.id and status not in ('resolved','accepted_risk'))
 );
 -- Snapshot evidence, not just booleans: any changed master/credit/rights/split requires a fresh sign-off.
 snapshot:=jsonb_build_object('title',t.working_title,'code',t.track_code,'artwork',jsonb_build_object('public',t.artwork_url,'private',t.artwork_storage_key),'master',to_jsonb(a),
 'visual',(select to_jsonb(v) from public.project_assets v where v.entity_type='track' and v.project_id=t.project_id and v.entity_id=t.id and v.asset_kind='visual' order by v.created_at desc,v.id desc limit 1),
 'credits',(select jsonb_agg(to_jsonb(c) order by c.id) from public.track_contributors c where track_id=t.id),
 'rights',(select jsonb_agg(to_jsonb(c) order by c.id) from public.track_rights_checks c where track_id=t.id),
 'plan',(select to_jsonb(c) from public.track_split_plans c where track_id=t.id),
 'splits',(select jsonb_agg(to_jsonb(c) order by c.id) from public.track_splits c where track_id=t.id),'checks',checks);
 fp:=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 select bool_and(value='true'::jsonb) into ok from jsonb_each(checks);
 blocked:=not (checks->>'final_master')::boolean or exists(select 1 from public.track_rights_checks where track_id=t.id and status='blocked');
 checks:=checks||jsonb_build_object('lead_signoff',coalesce(t.production_signoff->>'fingerprint'=fp,false));
 return jsonb_build_object('state',case when ok and coalesce(t.production_signoff->>'fingerprint'=fp,false) then 'Ready' when blocked then 'Blocked' else 'Needs attention' end,'checks',checks,'fingerprint',fp,'requirements_complete',ok,'master_id',a.id);
end;$$;

create function public.production_mutate(p_project uuid,p_actor uuid,p_action text,p_target uuid,p_revision integer,p_data jsonb,p_request uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.project_assets%rowtype; t public.tracks%rowtype; u public.production_uploads%rowtype;
 lead boolean; coordinator boolean; recipient uuid; old_state text; new_state text; task uuid; result jsonb; ready jsonb; session_project uuid;
begin
 -- Serialize workflow mutations per project, including duplicate retry keys.
 perform pg_advisory_xact_lock(hashtextextended(p_project::text,391));
 if not exists(select 1 from public.project_members where project_id=p_project and user_id=p_actor and status='active') then raise exception 'Active project membership required.'; end if;
 if exists(select 1 from public.platform_events where id=p_request) then
  if not exists(select 1 from public.platform_events where id=p_request and user_id=p_actor and project_id=p_project and event_name='production_'||p_action and entity_id=p_target and metadata->'input'=p_data) then raise exception 'This request key belongs to another operation.';end if;
  return (select metadata->'result' from public.platform_events where id=p_request);
 end if;
 lead:=public.production_has_role(p_project,p_actor,array['Super Admin','Admin','Project Lead']);
 coordinator:=lead or public.production_has_role(p_project,p_actor,array['A&R','Manager','Project Coordinator']);
 result:=jsonb_build_object('ok',true);
 if p_action in ('submit','approve','changes_requested') then
  select * into a from public.project_assets where id=p_target and project_id=p_project and entity_type='track' for update;
  if not found then raise exception 'Version not found in this project.';end if;
  if a.visibility='private' then raise exception 'Share this file with the project before requesting review.';end if;
  -- New multipart sessions are immutable once completed. Older R2 track PUT URLs
  -- last at most one hour; use a conservative two-hour window for legacy assets.
  if not exists(select 1 from public.production_uploads transfer where transfer.asset_id=a.id and transfer.project_id=p_project and transfer.track_id=a.entity_id and transfer.final_key=a.storage_path and transfer.status='completed')
   and not (a.bucket_id='r2' and a.created_at<now()-interval '2 hours') then
   raise exception 'This earlier upload is not yet immutable. Add a new version through Production, or wait for its R2 upload link to expire. The original stays available.';
  end if;
  if a.review_revision<>p_revision then raise exception 'This version changed. Reload before making a decision.';end if;
  old_state:=a.review_status;
  if p_action='submit' then
   if a.uploaded_by<>p_actor and not coordinator then raise exception 'Only the uploader or project coordinator can submit this version.';end if;
   if old_state not in ('in_progress','changes_requested') then raise exception 'This version is already submitted or approved.';end if;
   recipient:=(p_data->>'reviewer')::uuid;
   if recipient=a.uploaded_by or not public.production_has_role(p_project,recipient,array['Super Admin','Admin','Project Lead','A&R','Artist','Producer']) then raise exception 'Choose an independent artist, producer or project lead in this project.';end if;
   new_state:='submitted';
   insert into public.project_tasks(project_id,track_id,title,description,assignee_id,created_by,due_date) values(p_project,a.entity_id,'Review: '||a.file_name,'Review this specific version in the production workspace: '||a.id,recipient,p_actor,nullif(p_data->>'due_date','')::date) returning id into task;
  else
   if old_state<>'submitted' then raise exception 'Only submitted versions can be reviewed.';end if;
   if p_actor<>a.review_assignee or p_actor=a.uploaded_by or not public.production_has_role(p_project,p_actor,array['Super Admin','Admin','Project Lead','A&R','Artist','Producer']) then raise exception 'Only the assigned independent reviewer can decide.';end if;
   if length(trim(coalesce(p_data->>'note','')))<2 then raise exception 'Add a decision note.';end if;
   recipient:=a.uploaded_by;new_state:=case when p_action='approve' then 'approved' else p_action end;task:=a.review_task_id;
   update public.project_tasks set status='done',updated_at=now() where id=task and project_id=p_project;
  end if;
  update public.project_assets set review_status=new_state,review_revision=review_revision+1,review_assignee=case when p_action='submit' then recipient else review_assignee end,review_task_id=task where id=a.id;
  insert into public.notifications(user_id,project_id,type,title,body,entity_type,entity_id) values(recipient,p_project,'production_review','Version '||replace(new_state,'_',' '),a.file_name||coalesce(': '||nullif(p_data->>'note',''),''),'production_asset',a.id);
  result:=result||jsonb_build_object('status',new_state,'revision',a.review_revision+1);
 elsif p_action in ('signoff','track_stage') then
  select * into t from public.tracks where id=p_target and project_id=p_project for update;
  if not found then raise exception 'Track not found in this project.';end if;
  if p_action='signoff' then
   if not lead then raise exception 'Project-lead approval required.';end if;
   if length(trim(coalesce(p_data->>'note','')))<2 then raise exception 'Add a project-lead decision note.';end if;
   ready:=public.production_readiness(t.id);
   if not (ready->>'requirements_complete')::boolean then raise exception 'Resolve the outstanding release requirements first.';end if;
   update public.tracks set production_signoff=jsonb_build_object('fingerprint',ready->>'fingerprint','actor',p_actor,'at',now(),'note',p_data->>'note') where id=t.id;
  else
   if not coordinator then raise exception 'Project coordinator required.';end if;
   new_state:=p_data->>'stage';
   if new_state not in ('in_development','revision','in_studio','mixing','mastering','release_ready','complete') then raise exception 'Invalid production stage.';end if;
   if new_state in ('release_ready','complete') and public.production_readiness(t.id)->>'state'<>'Ready' then raise exception 'The track is not release-ready.';end if;
   update public.tracks set status=new_state,development_status=new_state,updated_at=now() where id=t.id;
  end if;
 elsif p_action='project_stage' then
  if not coordinator then raise exception 'Project coordinator required.';end if;
  new_state:=p_data->>'stage';
  if new_state not in ('Preparation','Recording','Production','Mixing','Mastering','Credits & Splits','Release readiness','Complete') then raise exception 'Invalid project stage.';end if;
  if new_state='Complete' and (not exists(select 1 from public.tracks where project_id=p_project) or exists(select 1 from public.tracks where project_id=p_project and public.production_readiness(id)->>'state'<>'Ready')) then raise exception 'Every track must be release-ready before completing production.';end if;
  update public.projects set current_stage=new_state,next_action=nullif(p_data->>'next_action',''),target_release_date=nullif(p_data->>'deadline','')::date,updated_at=now() where id=p_project;
 elsif p_action='attendance' then
  select project_id into session_project from public.studio_sessions where id=p_target;
  if session_project is distinct from p_project or not (coordinator or exists(select 1 from public.studio_sessions where id=p_target and (engineer_id=p_actor or producer_id=p_actor or created_by=p_actor))) then raise exception 'Session coordinator required.';end if;
  if p_data->>'attendance' not in ('unrecorded','attended','absent','excused') then raise exception 'Invalid attendance.';end if;
  update public.session_participants set attendance=p_data->>'attendance',attendance_recorded_by=p_actor,attendance_recorded_at=now() where session_id=p_target and user_id=(p_data->>'participant')::uuid;
  if not found then raise exception 'Participant not assigned to this session.';end if;
 elsif p_action='register_upload' then
  select * into u from public.production_uploads where id=p_target and project_id=p_project and user_id=p_actor for update;
  if not found or u.status='aborted' then raise exception 'Upload is not available to this account.';end if;
  if not public.production_has_role(p_project,p_actor,array['Super Admin','Admin','Project Lead','A&R','Artist','Producer','Engineer','Contributor','Songwriter','Videographer','Visual Creative']) then raise exception 'Production file access required.';end if;
  if u.status='completed' then return jsonb_build_object('ok',true,'asset_id',u.asset_id);end if;
  if u.expires_at<now() then raise exception 'Upload expired. Prepare a new transfer.';end if;
  -- Object metadata is verified by the server against R2 before calling this RPC.
  if (p_data->>'size')::bigint<>u.byte_size or p_data->>'key'<>u.final_key or length(coalesce(p_data->>'etag',''))=0 then raise exception 'The transferred file does not match this upload.';end if;
  perform 1 from public.tracks where id=u.track_id and project_id=p_project for update;
  if not found then raise exception 'Upload track is no longer available.';end if;
  insert into public.project_assets(project_id,entity_type,entity_id,uploaded_by,bucket_id,storage_path,file_name,mime_type,asset_kind,visibility,version_note,byte_size,storage_etag)
  values(p_project,'track',u.track_id,p_actor,'r2',u.final_key,u.file_name,u.mime_type,u.asset_kind,'project',u.version_note,u.byte_size,p_data->>'etag') returning id into recipient;
  update public.production_uploads set status='completed',asset_id=recipient where id=u.id;
  result:=result||jsonb_build_object('asset_id',recipient);
 else raise exception 'Unknown production action.';
 end if;
 insert into public.platform_events(id,user_id,project_id,event_name,category,entity_type,entity_id,metadata)
 values(p_request,p_actor,p_project,'production_'||p_action,'music',case when p_action='attendance' then 'session' when p_action='project_stage' then 'project' when p_action in ('submit','approve','changes_requested') then 'asset' else 'track' end,p_target,jsonb_build_object('input',p_data,'previous_status',old_state,'result',result));
 insert into public.activity_log(project_id,user_id,action,entity_type,entity_id) values(p_project,p_actor,
 case p_action when 'submit' then 'submitted '||a.file_name||' for review' when 'approve' then 'approved '||a.file_name when 'changes_requested' then 'requested changes to '||a.file_name
 when 'register_upload' then 'added production file '||u.file_name when 'project_stage' then 'set project stage to '||new_state when 'track_stage' then 'set track stage to '||new_state
 when 'signoff' then 'approved release preparation for '||t.working_title when 'attendance' then 'recorded session attendance' else replace(p_action,'_',' ') end,
 case when p_action='attendance' then 'session' when p_action='project_stage' then 'project' else 'track' end,
 case when p_action='attendance' then p_target when p_action='project_stage' then p_project when p_action='register_upload' then u.track_id when p_action in ('submit','approve','changes_requested') then a.entity_id else p_target end);
 return result;
end;$$;

revoke all on function public.production_has_role(uuid,uuid,text[]) from public,anon,authenticated;
revoke all on function public.production_readiness(uuid) from public,anon,authenticated;
revoke all on function public.production_mutate(uuid,uuid,text,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.production_has_role(uuid,uuid,text[]) to service_role;
grant execute on function public.production_readiness(uuid) to service_role;
grant execute on function public.production_mutate(uuid,uuid,text,uuid,integer,jsonb,uuid) to service_role;

-- Prevent bypassing the release gate through older Data API track-edit paths.
create function public.production_guard_track_stage()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.development_status in ('release_ready','complete') or new.status in ('release_ready','complete') then
  if tg_op='INSERT' then raise exception 'New tracks require production approvals before release readiness.';end if;
  if new.development_status is distinct from old.development_status or new.status is distinct from old.status then
   if public.production_readiness(old.id)->>'state'<>'Ready' then raise exception 'Production approvals and current project-lead sign-off are required.';end if;
  end if;
 end if;
 return new;
end;$$;
revoke all on function public.production_guard_track_stage() from public,anon,authenticated;
grant execute on function public.production_guard_track_stage() to service_role;
create trigger production_track_stage_guard before insert or update on public.tracks for each row execute function public.production_guard_track_stage();

-- A private, boolean-only lookup is necessary to avoid sessions/participants RLS recursion.
-- It always binds to auth.uid(), checks active membership, and is not in an exposed API schema.
create schema if not exists fackts_private;
revoke all on schema fackts_private from public,anon;
grant usage on schema fackts_private to authenticated,service_role;
create function fackts_private.production_session_visible(p_session uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studio_sessions s join public.project_members m on m.project_id=s.project_id
 where s.id=p_session and m.user_id=(select auth.uid()) and m.status='active' and (
 s.created_by=(select auth.uid()) or s.engineer_id=(select auth.uid()) or s.producer_id=(select auth.uid()) or s.ar_id=(select auth.uid())
 or exists(select 1 from public.session_participants p where p.session_id=s.id and p.user_id=(select auth.uid()))
 or exists(select 1 from public.member_roles mr join public.roles r on r.id=mr.role_id where mr.project_member_id=m.id and r.name in ('Super Admin','Admin','Project Lead','A&R','Manager','Project Coordinator'))));
$$;
revoke all on function fackts_private.production_session_visible(uuid) from public,anon;
grant execute on function fackts_private.production_session_visible(uuid) to authenticated,service_role;
alter table public.studio_sessions enable row level security;
alter table public.session_participants enable row level security;
drop policy if exists "Members read sessions" on public.studio_sessions;
drop policy if exists "Leads manage sessions" on public.studio_sessions;
create policy "Assigned production sessions" on public.studio_sessions for select to authenticated using (fackts_private.production_session_visible(id));
drop policy if exists "Members read session participants" on public.session_participants;
create policy "Assigned production session participants" on public.session_participants for select to authenticated using(fackts_private.production_session_visible(session_id));
revoke insert,update,delete on public.studio_sessions,public.session_participants from public,anon,authenticated;
grant select on public.studio_sessions,public.session_participants to authenticated;
-- Existing server actions validate project scope and assignments; the service role remains the writer.
grant select,insert,update,delete on public.studio_sessions,public.session_participants to service_role;
drop policy if exists "Members read project assets" on public.project_assets;
create policy "Members read project assets" on public.project_assets for select to authenticated using (
 visibility='public' or (exists(select 1 from public.project_members m where m.project_id=project_assets.project_id and m.user_id=(select auth.uid()) and m.status='active') and (visibility='project' or uploaded_by=(select auth.uid())))
);
