-- FACKTS Music — Admin governance, project appearance, notifications.
-- ADDITIVE ONLY. THIS FILE DOES NOT MODIFY track_votes.

create extension if not exists pgcrypto;

alter table public.control_room_admins
  add column if not exists permissions text[] not null default '{}';

alter table public.projects
  add column if not exists project_type text,
  add column if not exists hero_image_url text,
  add column if not exists next_action text,
  add column if not exists start_date date,
  add column if not exists target_release_date date,
  add column if not exists artwork_url text;

-- Super Admin retains full authority.
insert into public.control_room_admins(user_id,granted_by,active,permissions,notes)
select distinct pm.user_id,pm.user_id,true,array['all']::text[],'Super Admin full platform authority'
from public.project_members pm
join public.member_roles mr on mr.project_member_id=pm.id
join public.roles r on r.id=mr.role_id
where pm.status='active' and r.name='Super Admin'
on conflict(user_id) do update set active=true,permissions=array['all']::text[],updated_at=now();

-- Existing Admins become cross-project operators, not automatic Super Admins.
insert into public.control_room_admins(user_id,granted_by,active,permissions,notes)
select distinct pm.user_id,
  (select spm.user_id from public.project_members spm join public.member_roles smr on smr.project_member_id=spm.id join public.roles sr on sr.id=smr.role_id where spm.status='active' and sr.name='Super Admin' limit 1),
  true,
  array['people','projects','music','tasks','sessions','documents','commercial','enquiries','intelligence','reports']::text[],
  'Admin cross-project operating access'
from public.project_members pm
join public.member_roles mr on mr.project_member_id=pm.id
join public.roles r on r.id=mr.role_id
where pm.status='active' and r.name='Admin'
and not exists(
  select 1 from public.project_members spm
  join public.member_roles smr on smr.project_member_id=spm.id
  join public.roles sr on sr.id=smr.role_id
  where spm.user_id=pm.user_id and spm.status='active' and sr.name='Super Admin'
)
on conflict(user_id) do update set
  active=true,
  permissions=case
    when cardinality(public.control_room_admins.permissions)=0
      or public.control_room_admins.permissions=array['all']::text[]
    then excluded.permissions else public.control_room_admins.permissions end,
  updated_at=now();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-media','project-media',true,12582912,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Notify project members when important existing admin actions emit platform_events.
create or replace function public.notify_members_from_project_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare title_text text;
begin
  if new.project_id is null then return new; end if;
  title_text := case new.event_name
    when 'project_settings_updated' then 'Project settings updated'
    when 'project_appearance_updated' then 'Project appearance updated'
    when 'beat_metadata_updated' then 'Beat information updated'
    when 'track_metadata_updated' then 'Track information updated'
    when 'beat_artwork_updated' then 'Beat artwork updated'
    when 'track_artwork_updated' then 'Track artwork updated'
    when 'beat_credits_replaced' then 'Beat credits updated'
    when 'track_credits_replaced' then 'Track credits updated'
    else null end;
  if title_text is null then return new; end if;
  insert into public.notifications(user_id,project_id,type,title,body,entity_type,entity_id)
  select pm.user_id,new.project_id,'project_update',title_text,replace(new.event_name,'_',' '),new.entity_type,new.entity_id
  from public.project_members pm
  where pm.project_id=new.project_id and pm.status='active'
    and (new.user_id is null or pm.user_id<>new.user_id);
  return new;
end $$;

drop trigger if exists platform_event_project_notifications on public.platform_events;
create trigger platform_event_project_notifications
after insert on public.platform_events
for each row execute function public.notify_members_from_project_event();

-- Voting safety declaration:
-- No UPDATE, DELETE, TRUNCATE, DROP, INSERT or ALTER is performed on public.track_votes.
