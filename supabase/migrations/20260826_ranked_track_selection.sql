-- FACKTS Music internal song-selection room.
-- Additive: the original track_votes table remains untouched for compatibility.

create table if not exists public.track_voting_rounds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'Project song selection',
  status text not null default 'open' check (status in ('open','closed')),
  results_visible boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_track_round_per_project
  on public.track_voting_rounds(project_id) where status = 'open';

insert into public.track_voting_rounds(project_id, title)
select p.id, 'Project 001 song selection'
from public.projects p
where p.status = 'active'
  and not exists (
    select 1 from public.track_voting_rounds r where r.project_id = p.id
  );

create table if not exists public.track_listens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  unique(track_id, user_id)
);

create table if not exists public.track_rankings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.track_voting_rounds(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  points smallint generated always as (
    case rank when 1 then 5 when 2 then 3 when 3 then 1 end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, user_id, track_id),
  unique(round_id, user_id, rank)
);

create table if not exists public.track_ar_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.track_voting_rounds(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  song_quality smallint not null check (song_quality between 1 and 10),
  originality smallint not null check (originality between 1 and 10),
  replay_value smallint not null check (replay_value between 1 and 10),
  performance_potential smallint not null check (performance_potential between 1 and 10),
  release_readiness smallint not null check (release_readiness between 1 and 10),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, track_id, evaluator_id)
);

create index if not exists track_rankings_round_track_idx on public.track_rankings(round_id, track_id);
create index if not exists track_ar_scores_round_track_idx on public.track_ar_scores(round_id, track_id);
create index if not exists track_listens_user_idx on public.track_listens(user_id, track_id);

alter table public.track_voting_rounds enable row level security;
alter table public.track_listens enable row level security;
alter table public.track_rankings enable row level security;
alter table public.track_ar_scores enable row level security;

drop policy if exists "members read track voting rounds" on public.track_voting_rounds;
create policy "members read track voting rounds" on public.track_voting_rounds for select
  using (public.is_project_member(project_id));

drop policy if exists "members read track listens" on public.track_listens;
drop policy if exists "members read own track listens" on public.track_listens;
create policy "members read own track listens" on public.track_listens for select
  using (auth.uid() = user_id and public.is_project_member(project_id));
drop policy if exists "members record own track listens" on public.track_listens;
create policy "members record own track listens" on public.track_listens for all
  using (auth.uid() = user_id and public.is_project_member(project_id))
  with check (auth.uid() = user_id and public.is_project_member(project_id));

drop policy if exists "members read track rankings" on public.track_rankings;
create policy "members read track rankings" on public.track_rankings for select
  using (
    public.is_project_member(project_id)
    and (
      auth.uid() = user_id
      or exists (
        select 1 from public.track_voting_rounds r
        where r.id = round_id and (r.results_visible or r.status = 'closed')
      )
    )
  );

drop policy if exists "members read ar scores" on public.track_ar_scores;
create policy "members read ar scores" on public.track_ar_scores for select
  using (
    public.is_project_member(project_id)
    and (
      auth.uid() = evaluator_id
      or exists (
        select 1 from public.track_voting_rounds r
        where r.id = round_id and (r.results_visible or r.status = 'closed')
      )
    )
  );

create or replace function public.record_track_listen(p_track_id uuid, p_progress integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_project_id uuid;
begin
  select project_id into v_project_id from public.tracks where id = p_track_id;
  if v_project_id is null or not public.is_project_member(v_project_id) then
    raise exception 'Project access required';
  end if;
  insert into public.track_listens(project_id, track_id, user_id, progress_percent)
  values (v_project_id, p_track_id, auth.uid(), least(100, greatest(0, p_progress)))
  on conflict (track_id, user_id) do update
    set progress_percent = greatest(track_listens.progress_percent, excluded.progress_percent),
        updated_at = now();
end;
$$;

create or replace function public.set_track_ranking(p_track_id uuid, p_rank integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_project_id uuid; v_round_id uuid; v_progress integer;
begin
  if p_rank not between 1 and 3 then raise exception 'Choose a rank from 1 to 3'; end if;
  select project_id into v_project_id from public.tracks where id = p_track_id;
  if v_project_id is null or not public.is_project_member(v_project_id) then raise exception 'Project access required'; end if;
  if exists(select 1 from public.track_contributors where track_id = p_track_id and user_id = auth.uid()) then
    raise exception 'Contributors cannot rank their own track';
  end if;
  select progress_percent into v_progress from public.track_listens where track_id = p_track_id and user_id = auth.uid();
  if coalesce(v_progress,0) < 60 then raise exception 'Listen to at least 60 percent before ranking this track'; end if;
  select id into v_round_id from public.track_voting_rounds where project_id = v_project_id and status = 'open' order by created_at desc limit 1;
  if v_round_id is null then raise exception 'Voting is closed'; end if;
  delete from public.track_rankings where round_id = v_round_id and user_id = auth.uid() and (rank = p_rank or track_id = p_track_id);
  insert into public.track_rankings(round_id, project_id, track_id, user_id, rank)
  values (v_round_id, v_project_id, p_track_id, auth.uid(), p_rank);
end;
$$;

grant execute on function public.record_track_listen(uuid, integer) to authenticated;
grant execute on function public.set_track_ranking(uuid, integer) to authenticated;
