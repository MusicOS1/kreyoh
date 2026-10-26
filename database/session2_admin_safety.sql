-- PREPARED ONLY: not applied to the shared/live database.
-- Generate a timestamped Supabase migration and apply to an authorised isolated
-- database before owner-approved rollout. Existing grants are not rewritten.
begin;
create or replace function public.guard_platform_admin_change()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare actor uuid; remaining integer;
begin
  -- Serialize governance changes, including simultaneous cross-revocations.
  perform pg_advisory_xact_lock(190481822,2);
  if tg_op='DELETE' then raise exception 'Disable administrator access instead of deleting its grant.';end if;
  actor:=new.granted_by;
  if actor is null or not exists(select 1 from public.control_room_admins where user_id=actor and active and permissions @> array['all']::text[]) then
    raise exception 'An active full platform administrator is required.';
  end if;
  if new.user_id=actor then raise exception 'You cannot change your own full administrator access.';end if;
  if tg_op='UPDATE' and old.active and old.permissions @> array['all']::text[]
    and (not new.active or not new.permissions @> array['all']::text[]) then
    select count(*) into remaining from public.control_room_admins where active and permissions @> array['all']::text[] and user_id<>old.user_id;
    if remaining<1 then raise exception 'Cannot disable the last full platform administrator.';end if;
  end if;
  return new;
end $$;
create or replace function public.audit_platform_admin_change()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  insert into public.platform_events(user_id,event_name,category,entity_type,entity_id,metadata)
  values(new.granted_by,'control_room_access_changed','admin','profile',new.user_id,
    jsonb_build_object('operation',tg_op,'previous',case when tg_op='UPDATE' then to_jsonb(old) else null end,'current',to_jsonb(new)));
  return new;
end $$;
revoke all on function public.guard_platform_admin_change() from public,anon,authenticated;
revoke all on function public.audit_platform_admin_change() from public,anon,authenticated;
drop trigger if exists guard_platform_admin_change on public.control_room_admins;
create trigger guard_platform_admin_change before insert or update or delete on public.control_room_admins for each row execute function public.guard_platform_admin_change();
drop trigger if exists audit_platform_admin_change on public.control_room_admins;
create trigger audit_platform_admin_change after insert or update on public.control_room_admins for each row execute function public.audit_platform_admin_change();
commit;
