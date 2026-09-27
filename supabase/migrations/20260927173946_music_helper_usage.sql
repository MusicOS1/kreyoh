begin;
create table public.music_helper_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_day date not null default current_date,
  requests integer not null default 0 check(requests between 0 and 20),
  primary key(user_id,usage_day)
);
alter table public.music_helper_usage enable row level security;
revoke all on public.music_helper_usage from anon,authenticated;
grant all on public.music_helper_usage to service_role;
create function public.reserve_music_helper_request(p_user uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.'; end if;
  if not exists(select 1 from public.project_members where user_id=p_user and status='active') then return false; end if;
  insert into public.music_helper_usage(user_id,usage_day,requests) values(p_user,current_date,1)
    on conflict(user_id,usage_day) do update set requests=public.music_helper_usage.requests+1
    where public.music_helper_usage.requests<20 returning requests into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.reserve_music_helper_request(uuid) from public,anon,authenticated;
grant execute on function public.reserve_music_helper_request(uuid) to service_role;
commit;
