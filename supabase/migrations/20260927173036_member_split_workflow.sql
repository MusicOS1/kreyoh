-- All split writes go through a server-only, transactional workflow.
-- Existing percentages and confirmations are preserved on installation.
begin;
create table public.track_split_plans (
  track_id uuid primary key references public.tracks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null default 0,
  status text not null default 'draft' check (status in ('draft','awaiting_confirmation','confirmed')),
  updated_at timestamptz not null default now()
);
alter table public.track_split_plans enable row level security;
create policy "members read split plans" on public.track_split_plans for select to authenticated using (public.is_project_member(project_id));
grant select on public.track_split_plans to authenticated;
grant all on public.track_split_plans to service_role;
insert into public.track_split_plans(track_id,project_id,version,status)
select track_id,project_id,1,case when sum(percentage)=100 and bool_and(status='confirmed') then 'confirmed'
 when sum(percentage)=100 and bool_and(status in ('confirmed','awaiting_confirmation')) then 'awaiting_confirmation' else 'draft' end
from public.track_splits group by track_id,project_id;

-- Browser credentials can read permitted rows, but cannot edit ownership or approvals.
drop policy if exists "contributors confirm own splits" on public.track_splits;
drop policy if exists "management manages track splits" on public.track_splits;
revoke insert,update,delete on public.track_splits from anon,authenticated;

create function public.manage_split_plan(
  p_actor uuid, p_project uuid, p_track uuid, p_operation text,
  p_version integer, p_rows jsonb default '[]'::jsonb,
  p_split uuid default null, p_reason text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_plan public.track_split_plans%rowtype;
  v_management boolean;
  v_total numeric;
  v_count integer;
  v_title text;
  v_snapshot jsonb;
  v_status text;
  v_version integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.'; end if;
  if not exists(select 1 from public.project_members where project_id=p_project and user_id=p_actor and status='active') then
    raise exception 'Active project membership required.';
  end if;
  select exists(select 1 from public.project_members m join public.member_roles mr on mr.project_member_id=m.id
    join public.roles r on r.id=mr.role_id where m.project_id=p_project and m.user_id=p_actor and m.status='active'
    and r.name in ('Super Admin','Admin','Project Lead','Project Admin')) into v_management;
  -- One lock covers the entire plan, including the first allocation.
  select working_title into v_title from public.tracks where id=p_track and project_id=p_project for update;
  if not found then raise exception 'Song not found in this project.'; end if;
  insert into public.track_split_plans(track_id,project_id) values(p_track,p_project) on conflict do nothing;
  select * into v_plan from public.track_split_plans where track_id=p_track;
  if p_version is distinct from v_plan.version then raise exception 'This proposal has changed. Refresh and review the latest version.'; end if;
  if p_operation not in ('save','send','confirm','request_change') or p_operation is null then raise exception 'Unknown split action.'; end if;
  if p_operation in ('save','send') and not v_management then raise exception 'Project management access required.'; end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_snapshot from public.track_splits s where track_id=p_track;
  v_version:=v_plan.version;
  v_status:=v_plan.status;

  if p_operation='save' then
    if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>100 then raise exception 'Use a valid allocation list of up to 100 rows.'; end if;
    if exists(select 1 from jsonb_array_elements(p_rows) r where
      coalesce(r->>'contributor_id','')='' or coalesce(btrim(r->>'contribution_role'),'')='' or length(r->>'contribution_role')>100
      or coalesce(r->>'percentage','') !~ '^[0-9]+(\.[0-9]{1,2})?$') then raise exception 'Complete each contributor, role and percentage (up to two decimal places).'; end if;
    if exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'percentage')::numeric<0 or (r->>'percentage')::numeric>100) then raise exception 'Percentages must be between 0 and 100.'; end if;
    if exists(select 1 from jsonb_array_elements(p_rows) r group by r->>'contributor_id',lower(btrim(r->>'contribution_role')) having count(*)>1) then raise exception 'Combine duplicate contributor and role allocations.'; end if;
    if exists(select 1 from jsonb_array_elements(p_rows) r where not exists(select 1 from public.project_members m where m.project_id=p_project and m.user_id=(r->>'contributor_id')::uuid and m.status='active')) then raise exception 'Every contributor must be an active project member.'; end if;
    select coalesce(sum((r->>'percentage')::numeric),0) into v_total from jsonb_array_elements(p_rows) r;
    if v_total>100 then raise exception 'The allocation total cannot exceed 100%%.'; end if;
    delete from public.track_splits where track_id=p_track;
    insert into public.track_splits(project_id,track_id,contributor_id,contribution_role,percentage,status,created_by)
      select p_project,p_track,(r->>'contributor_id')::uuid,btrim(r->>'contribution_role'),(r->>'percentage')::numeric,'draft',p_actor from jsonb_array_elements(p_rows) r;
    v_version:=v_version+1; v_status:='draft';
  elsif p_operation='send' then
    if v_plan.status<>'draft' then raise exception 'This proposal has already been sent. Save a revised draft before sending again.'; end if;
    select coalesce(sum(percentage),0),count(*) into v_total,v_count from public.track_splits where track_id=p_track;
    if v_total<>100 or v_count=0 then raise exception 'Allocate exactly 100%% before sending for confirmation.'; end if;
    if exists(select 1 from public.track_splits s where s.track_id=p_track and not exists(select 1 from public.project_members m where m.project_id=p_project and m.user_id=s.contributor_id and m.status='active')) then raise exception 'A contributor no longer has project access. Update the draft first.'; end if;
    update public.track_splits set status='awaiting_confirmation',confirmed_at=null,updated_at=now() where track_id=p_track;
    v_version:=v_version+1; v_status:='awaiting_confirmation';
    insert into public.notifications(user_id,project_id,type,title,body,entity_type,entity_id,action_url)
      select distinct contributor_id,p_project,'split_confirmation_required','Review your song split',
        coalesce(v_title,'Song') || ': review the complete proposal and confirm your share.','track',p_track,'/splits?track='||p_track
      from public.track_splits where track_id=p_track;
  elsif p_operation='confirm' then
    if v_plan.status<>'awaiting_confirmation' then raise exception 'This proposal is not awaiting confirmation.'; end if;
    update public.track_splits set status='confirmed',confirmed_at=now(),updated_at=now()
      where id=p_split and track_id=p_track and contributor_id=p_actor and status='awaiting_confirmation';
    if not found then raise exception 'This share is no longer awaiting your confirmation.'; end if;
    if (select sum(percentage)=100 and bool_and(status='confirmed') from public.track_splits where track_id=p_track) then v_status:='confirmed'; end if;
  elsif p_operation='request_change' then
    if coalesce(length(btrim(p_reason)),0)=0 or length(p_reason)>2000 then raise exception 'Explain the requested change in up to 2000 characters.'; end if;
    if v_plan.status='draft' or not exists(select 1 from public.track_splits where id=p_split and track_id=p_track and contributor_id=p_actor) then raise exception 'No current proposal is available for this change request.'; end if;
    update public.track_splits set status='draft',confirmed_at=null,updated_at=now() where track_id=p_track;
    v_status:='draft'; v_version:=v_version+1;
    insert into public.notifications(user_id,project_id,type,title,body,entity_type,entity_id,action_url)
      select distinct m.user_id,p_project,'split_change_requested','Split change requested',coalesce(v_title,'Song')||': '||p_reason,'track',p_track,'/splits?track='||p_track
      from public.project_members m join public.member_roles mr on mr.project_member_id=m.id join public.roles r on r.id=mr.role_id
      where m.project_id=p_project and m.status='active' and r.name in ('Super Admin','Admin','Project Lead','Project Admin');
  end if;
  update public.track_split_plans set version=v_version,status=v_status,updated_at=now() where track_id=p_track;
  insert into public.track_rights_checks(project_id,track_id,check_key,status,evidence_note,updated_by,updated_at)
    values(p_project,p_track,'splits_confirmed',case when v_status='confirmed' then 'clear' else 'pending' end,
      case when v_status='confirmed' then 'All shares in the current proposal are confirmed.' else 'Current proposal requires contributor confirmation.' end,p_actor,now())
    on conflict(track_id,check_key) do update set status=excluded.status,evidence_note=excluded.evidence_note,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  insert into public.platform_events(user_id,project_id,event_name,category,entity_type,entity_id,metadata)
    values(p_actor,p_project,'split_plan_'||p_operation,'rights','track',p_track,
      jsonb_build_object('previous_version',v_plan.version,'version',v_version,'previous_rows',v_snapshot,'reason',p_reason,'split_id',p_split));
  return jsonb_build_object('version',v_version,'status',v_status);
end;
$$;
revoke all on function public.manage_split_plan(uuid,uuid,uuid,text,integer,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_split_plan(uuid,uuid,uuid,text,integer,jsonb,uuid,text) to service_role;

-- Remove stale clearance left by the old workflow without changing any shares.
update public.track_rights_checks c set status='pending',evidence_note='The current split proposal is not fully confirmed.',updated_at=now()
where c.check_key='splits_confirmed' and c.status in ('clear','not_applicable') and not exists (
  select 1 from public.track_split_plans p where p.track_id=c.track_id and p.status='confirmed'
);
commit;
