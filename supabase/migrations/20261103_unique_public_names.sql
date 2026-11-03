-- Prevent two accounts from claiming the same public-facing FACKTS Music name.
-- Existing duplicate legacy display names are left untouched. Future claims
-- and changes are protected in PostgreSQL, including concurrent signups.
alter table public.profiles
  add column if not exists public_name text;

create or replace function public.fackts_normalize_public_name(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(value,'')), '[[:space:]]+', ' ', 'g'));
$$;

create unique index if not exists profiles_unique_public_name_claim
on public.profiles (public.fackts_normalize_public_name(public_name))
where public_name is not null and btrim(public_name) <> '';

create or replace function public.fackts_public_name_available(
  candidate text,
  excluded_profile_id uuid default null
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare key text := public.fackts_normalize_public_name(candidate);
begin
  if char_length(btrim(coalesce(candidate,''))) < 2
    or char_length(btrim(candidate)) > 50 then
    return false;
  end if;
  return not exists(
    select 1 from public.profiles p
    where (excluded_profile_id is null or p.id <> excluded_profile_id)
      and (
        public.fackts_normalize_public_name(p.public_name) = key
        or public.fackts_normalize_public_name(p.stage_name) = key
        or public.fackts_normalize_public_name(p.nickname) = key
        or (
          nullif(btrim(coalesce(p.stage_name,'')),'') is null
          and nullif(btrim(coalesce(p.nickname,'')),'') is null
          and public.fackts_normalize_public_name(p.full_name) = key
        )
      )
  );
end;
$$;
revoke all on function public.fackts_public_name_available(text,uuid) from public, anon, authenticated;
grant execute on function public.fackts_public_name_available(text,uuid) to service_role;

create or replace function public.fackts_protect_public_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_effective text;
  current_effective text;
  old_key text;
  new_key text;
begin
  current_effective := coalesce(
    nullif(btrim(new.stage_name),''),
    nullif(btrim(new.nickname),''),
    nullif(btrim(new.full_name),'')
  );
  if tg_op = 'UPDATE' then
    previous_effective := coalesce(
      nullif(btrim(old.stage_name),''),
      nullif(btrim(old.nickname),''),
      nullif(btrim(old.full_name),'')
    );
    -- Keep the claim in sync when someone changes the name shown publicly
    -- through Settings or an authorised Admin edit.
    if new.public_name is not distinct from old.public_name
       and current_effective is distinct from previous_effective then
      new.public_name := current_effective;
    end if;
    old_key := public.fackts_normalize_public_name(old.public_name);
  else
    old_key := '';
  end if;

  new.public_name := nullif(regexp_replace(btrim(coalesce(new.public_name,'')), '[[:space:]]+', ' ', 'g'),'');
  if new.public_name is null then
    return new;
  end if;

  new_key := public.fackts_normalize_public_name(new.public_name);
  if char_length(new.public_name) < 2 or char_length(new.public_name) > 50 then
    raise exception 'Public name must contain 2 to 50 characters.' using errcode='23514';
  end if;

  if tg_op = 'INSERT' or new_key is distinct from old_key then
    if not public.fackts_public_name_available(new.public_name,new.id) then
      raise exception 'This public name is already registered.' using errcode='23505',
        constraint='profiles_unique_public_name_claim';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_fackts_public_name on public.profiles;
create trigger protect_fackts_public_name
before insert or update of public_name, stage_name, nickname, full_name
on public.profiles for each row
execute function public.fackts_protect_public_name();

comment on column public.profiles.public_name is
  'Unique public-facing name claim for new accounts; separate from legal full_name. Legacy duplicate names are retained until reviewed.';
