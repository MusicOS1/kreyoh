-- Catalogue release packages. Platform administrator is not assumed to be an artist.
-- Existing recordings, listen counts, media keys, ownership and financial data are not modified.
create table if not exists public.music_release_packages (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 160),
 owner_profile_id uuid not null references public.profiles(id) on delete restrict,
 format text not null default 'project'
   check (format in ('project','ep','mixtape','album','lp')),
 updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists music_release_packages_owner_name_unique
 on public.music_release_packages (owner_profile_id, lower(btrim(name)));
create index if not exists music_release_packages_format_recent_idx
 on public.music_release_packages (format, updated_at desc, id);
alter table public.music_release_packages enable row level security;
revoke all on public.music_release_packages from anon, authenticated;
grant select,insert,update,delete on public.music_release_packages to service_role;

alter table public.music_releases
 add column if not exists package_id uuid references public.music_release_packages(id) on delete set null;
create index if not exists music_releases_package_track_idx
 on public.music_releases (package_id, track_number, created_at, id);
create index if not exists music_releases_unpacked_recent_idx
 on public.music_releases (created_at desc, id) where package_id is null;

-- In the absence of explicit packaging decisions, keep legacy items as "Project".
-- We can safely infer EP only when the collection name explicitly says EP.
insert into public.music_release_packages (owner_profile_id,name,format)
select distinct on (r.artist_id,lower(btrim(r.collection)))
 r.artist_id,btrim(r.collection),
 case when upper(btrim(r.collection))='EP'
          or upper(btrim(r.collection)) like '% EP'
      then 'ep' else 'project' end
from public.music_releases r
where btrim(r.collection)<>''
order by r.artist_id,lower(btrim(r.collection)),r.created_at
on conflict do nothing;

update public.music_releases r
set package_id=p.id
from public.music_release_packages p
where r.package_id is null
  and btrim(r.collection)<>''
  and p.owner_profile_id=r.artist_id
  and lower(btrim(p.name))=lower(btrim(r.collection));

-- Assign new uploads and future release metadata edits to stable packages.
-- This runs under the original write role, not SECURITY DEFINER.
create or replace function public.music_release_package_sync()
returns trigger language plpgsql set search_path=public as $$
declare matched_id uuid;
begin
 if btrim(coalesce(new.collection,''))='' then
  new.package_id:=null;
  return new;
 end if;
 select p.id into matched_id from public.music_release_packages p
 where p.owner_profile_id=new.artist_id
   and lower(btrim(p.name))=lower(btrim(new.collection));
 if matched_id is null then
  insert into public.music_release_packages(name,owner_profile_id)
  values (btrim(new.collection),new.artist_id)
  on conflict do nothing;
  select p.id into matched_id from public.music_release_packages p
  where p.owner_profile_id=new.artist_id
    and lower(btrim(p.name))=lower(btrim(new.collection));
 end if;
 if matched_id is null then
  raise exception 'Could not associate public release with its collection';
 end if;
 new.package_id:=matched_id;
 return new;
end;
$$;
revoke all on function public.music_release_package_sync() from public, anon, authenticated;
grant execute on function public.music_release_package_sync() to service_role;
drop trigger if exists music_release_package_sync_trigger on public.music_releases;
create trigger music_release_package_sync_trigger
 before insert or update of collection,artist_id on public.music_releases
 for each row execute function public.music_release_package_sync();

comment on table public.music_release_packages is
 'Admin classification of collections: project, EP, mixtape, album or LP; a release without a package is a single.';
comment on column public.music_releases.package_id is
 'Admin catalogue grouping; no impact on credits, master ownership, fan statistics or payment rights.';
