insert into public.roles (name)
select 'Control Room Admin'
where not exists (select 1 from public.roles where name='Control Room Admin');

create table if not exists public.control_room_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.control_room_admins enable row level security;

-- Intentionally no authenticated policies. The browser cannot enumerate or
-- modify Control Room grants. Authorised server code uses the service role.

insert into public.control_room_admins (user_id, granted_by, notes)
select distinct pm.user_id, pm.user_id, 'Seeded from existing Super Admin role'
from public.project_members pm
join public.member_roles mr on mr.project_member_id=pm.id
join public.roles r on r.id=mr.role_id
where pm.status='active' and r.name in ('Super Admin','Admin')
on conflict (user_id) do nothing;

create or replace function public.is_control_room_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1 from public.control_room_admins cra
    where cra.user_id=auth.uid() and cra.active=true
  ) or exists (
    select 1
    from public.project_members pm
    join public.member_roles mr on mr.project_member_id=pm.id
    join public.roles r on r.id=mr.role_id
    where pm.user_id=auth.uid() and pm.status='active' and r.name in ('Super Admin','Admin')
  );
$$;

revoke all on function public.is_control_room_admin() from public;
grant execute on function public.is_control_room_admin() to authenticated;
