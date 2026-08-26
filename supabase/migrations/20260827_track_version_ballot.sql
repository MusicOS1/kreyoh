-- Separate listening and ranking records for every uploaded track version.
create table if not exists public.track_version_listens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  asset_id uuid not null references public.project_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  unique(asset_id,user_id)
);

create table if not exists public.track_version_rankings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.track_voting_rounds(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  asset_id uuid not null references public.project_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  points smallint generated always as (case rank when 1 then 5 when 2 then 3 when 3 then 1 end) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id,user_id,asset_id),
  unique(round_id,user_id,rank)
);

create index if not exists track_version_rankings_round_asset_idx on public.track_version_rankings(round_id,asset_id);
alter table public.track_version_listens enable row level security;
alter table public.track_version_rankings enable row level security;
drop policy if exists "members read own version listens" on public.track_version_listens;
create policy "members read own version listens" on public.track_version_listens for select using (auth.uid()=user_id and public.is_project_member(project_id));
drop policy if exists "members read version rankings" on public.track_version_rankings;
create policy "members read version rankings" on public.track_version_rankings for select using (public.is_project_member(project_id) and (auth.uid()=user_id or exists(select 1 from public.track_voting_rounds r where r.id=round_id and (r.results_visible or r.status='closed'))));

create or replace function public.record_track_version_listen(p_asset_id uuid,p_progress integer) returns void language plpgsql security definer set search_path=public as $$
declare v_track_id uuid; v_project_id uuid;
begin
  select a.entity_id,a.project_id into v_track_id,v_project_id from public.project_assets a where a.id=p_asset_id and a.entity_type='track';
  if v_project_id is null or not public.is_project_member(v_project_id) then raise exception 'Project access required'; end if;
  insert into public.track_version_listens(project_id,track_id,asset_id,user_id,progress_percent) values(v_project_id,v_track_id,p_asset_id,auth.uid(),least(100,greatest(0,p_progress)))
  on conflict(asset_id,user_id) do update set progress_percent=greatest(track_version_listens.progress_percent,excluded.progress_percent),updated_at=now();
end; $$;

create or replace function public.set_track_version_ranking(p_asset_id uuid,p_rank integer) returns void language plpgsql security definer set search_path=public as $$
declare v_track_id uuid; v_project_id uuid; v_round_id uuid; v_progress integer;
begin
  if p_rank not between 1 and 3 then raise exception 'Choose a rank from 1 to 3'; end if;
  select a.entity_id,a.project_id into v_track_id,v_project_id from public.project_assets a where a.id=p_asset_id and a.entity_type='track';
  if v_project_id is null or not public.is_project_member(v_project_id) then raise exception 'Project access required'; end if;
  if exists(select 1 from public.track_contributors where track_id=v_track_id and user_id=auth.uid()) then raise exception 'Contributors cannot rank their own track versions'; end if;
  select progress_percent into v_progress from public.track_version_listens where asset_id=p_asset_id and user_id=auth.uid();
  if coalesce(v_progress,0)<60 then raise exception 'Listen to at least 60 percent before ranking this version'; end if;
  select id into v_round_id from public.track_voting_rounds where project_id=v_project_id and status='open' order by created_at desc limit 1;
  if v_round_id is null then raise exception 'Voting is closed'; end if;
  delete from public.track_version_rankings where round_id=v_round_id and user_id=auth.uid() and (rank=p_rank or asset_id=p_asset_id);
  insert into public.track_version_rankings(round_id,project_id,track_id,asset_id,user_id,rank) values(v_round_id,v_project_id,v_track_id,p_asset_id,auth.uid(),p_rank);
end; $$;

grant execute on function public.record_track_version_listen(uuid,integer) to authenticated;
grant execute on function public.set_track_version_ranking(uuid,integer) to authenticated;
