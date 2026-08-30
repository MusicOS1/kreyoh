alter table public.control_room_admins
  add column if not exists permissions text[] not null default array['all']::text[];

update public.control_room_admins
set permissions = array['all']::text[]
where permissions is null or cardinality(permissions) = 0;

create or replace function public.has_control_room_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1 from public.control_room_admins cra
    where cra.user_id=auth.uid()
      and cra.active=true
      and ('all'=any(cra.permissions) or required_permission=any(cra.permissions))
  ) or exists (
    select 1 from public.project_members pm
    join public.member_roles mr on mr.project_member_id=pm.id
    join public.roles r on r.id=mr.role_id
    where pm.user_id=auth.uid() and pm.status='active' and r.name in ('Super Admin','Admin')
  );
$$;

revoke all on function public.has_control_room_permission(text) from public;
grant execute on function public.has_control_room_permission(text) to authenticated;