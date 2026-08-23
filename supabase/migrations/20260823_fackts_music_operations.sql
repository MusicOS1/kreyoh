-- FACKTS Music operational foundation.
-- Additive and safe for the existing FACKTS Music/Project 001 database.

create extension if not exists pgcrypto;

insert into public.roles (name)
select role_name
from unnest(array['Super Admin', 'Project Lead', 'A&R', 'Artist', 'Producer', 'Engineer', 'Finance']) role_name
where not exists (select 1 from public.roles r where r.name = role_name);

alter table public.profiles
  add column if not exists creator_types text[] not null default '{}',
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists streaming_links jsonb not null default '{}'::jsonb,
  add column if not exists skills_genres text[] not null default '{}',
  add column if not exists profile_visibility text not null default 'project',
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects
  add column if not exists default_beat_capacity integer not null default 3
    check (default_beat_capacity between 1 and 12),
  add column if not exists updated_at timestamptz not null default now();

alter table public.beats
  add column if not exists artwork_url text,
  add column if not exists audio_path text,
  add column if not exists duration_seconds integer,
  add column if not exists bpm integer check (bpm is null or bpm between 20 and 400),
  add column if not exists musical_key text,
  add column if not exists genre_tags text[] not null default '{}',
  add column if not exists mood_tags text[] not null default '{}',
  add column if not exists description text,
  add column if not exists artist_capacity integer check (artist_capacity is null or artist_capacity between 1 and 12),
  add column if not exists source_type text not null default 'external',
  add column if not exists external_source_id text,
  add column if not exists sync_status text not null default 'manual',
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.beat_claims (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'claimed'
    check (status in ('claimed','confirmed','released','removed','converted_to_track')),
  source text not null default 'artist',
  notes text,
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  removed_by uuid references public.profiles(id),
  override_reason text
);

create unique index if not exists beat_claims_one_active_artist
  on public.beat_claims(beat_id, artist_id)
  where status in ('claimed','confirmed','converted_to_track');
create index if not exists beat_claims_beat_status_idx on public.beat_claims(beat_id, status);
create index if not exists beat_claims_artist_idx on public.beat_claims(artist_id, status);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('beat','track','task','session')),
  entity_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'comment' check (kind in ('comment','idea','ar_note','revision')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_entity_idx on public.comments(entity_type, entity_id, created_at);

alter table public.tracks
  add column if not exists development_status text not null default 'in_development',
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.track_contributors (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contribution_role text not null default 'artist',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(track_id, user_id, contribution_role)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  due_date date,
  status text not null default 'to_do' check (status in ('to_do','in_progress','blocked','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_tasks_assignee_idx on public.project_tasks(assignee_id, status, due_date);

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  producer_id uuid references public.profiles(id),
  engineer_id uuid references public.profiles(id),
  ar_id uuid references public.profiles(id),
  status text not null default 'scheduled'
    check (status in ('scheduled','in_session','follow_up_required','complete','cancelled')),
  notes text,
  outcomes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_participants (
  session_id uuid not null references public.studio_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null default 'artist',
  primary key(session_id, user_id)
);

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  uploaded_by uuid not null references public.profiles(id),
  bucket_id text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  asset_kind text not null default 'reference',
  visibility text not null default 'project' check (visibility in ('private','project','public')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid() and pm.status = 'active'
  );
$$;

create or replace function public.has_project_role(p_project_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.member_roles mr on mr.project_member_id = pm.id
    join public.roles r on r.id = mr.role_id
    where pm.project_id = p_project_id and pm.user_id = auth.uid() and pm.status = 'active'
      and r.name = any(p_roles)
  );
$$;

create or replace function public.claim_beat(target_beat uuid, claim_notes text default null)
returns public.beat_claims
language plpgsql security definer set search_path = public
as $$
declare
  target public.beats;
  capacity integer;
  active_count integer;
  result public.beat_claims;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_beat::text, 0));
  select * into target from public.beats where id = target_beat for update;
  if target.id is null then raise exception using message = 'This beat no longer exists.'; end if;
  if not public.is_project_member(target.project_id) then raise exception using message = 'You need active project access to claim this beat.'; end if;
  if not public.has_project_role(target.project_id, array['Artist']) then raise exception using message = 'Only artists can claim beat slots.'; end if;
  if target.status in ('locked','completed','archived') then raise exception using message = 'This beat is not accepting claims.'; end if;
  if exists(select 1 from public.beat_claims where beat_id = target_beat and artist_id = auth.uid() and status in ('claimed','confirmed','converted_to_track')) then
    raise exception using message = 'You already hold a slot on this beat.';
  end if;
  select coalesce(target.artist_capacity, p.default_beat_capacity, 3) into capacity from public.projects p where p.id = target.project_id;
  select count(*) into active_count from public.beat_claims where beat_id = target_beat and status in ('claimed','confirmed','converted_to_track');
  if active_count >= capacity then raise exception using message = 'The final slot was just taken. You can still leave an idea.'; end if;
  insert into public.beat_claims(beat_id, project_id, artist_id, notes)
  values(target_beat, target.project_id, auth.uid(), nullif(trim(claim_notes),'')) returning * into result;
  active_count := active_count + 1;
  update public.beats set status = case when active_count >= capacity then 'full' else 'filling' end, updated_at = now() where id = target_beat;
  insert into public.activity_log(project_id,user_id,action,entity_type,entity_id)
  values(target.project_id,auth.uid(),'claimed a beat development slot','beat',target_beat);
  return result;
end;
$$;

create or replace function public.release_beat_claim(target_beat uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare target public.beats;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_beat::text, 0));
  select * into target from public.beats where id = target_beat for update;
  update public.beat_claims set status='released', released_at=now(), updated_at=now()
  where beat_id=target_beat and artist_id=auth.uid() and status='claimed';
  if not found then raise exception using message='No releasable claim was found.'; end if;
  update public.beats set status=case when exists(select 1 from public.beat_claims where beat_id=target_beat and status in ('claimed','confirmed','converted_to_track')) then 'filling' else 'available' end, updated_at=now() where id=target_beat;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beat-audio','beat-audio',false,104857600,array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg'])
on conflict (id) do update set public=false;

alter table public.beat_claims enable row level security;
alter table public.comments enable row level security;
alter table public.track_contributors enable row level security;
alter table public.project_tasks enable row level security;
alter table public.studio_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.project_assets enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Members read project beat claims" on public.beat_claims;
create policy "Members read project beat claims" on public.beat_claims for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Members read project comments" on public.comments;
create policy "Members read project comments" on public.comments for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Members create project comments" on public.comments;
create policy "Members create project comments" on public.comments for insert to authenticated with check (user_id=auth.uid() and public.is_project_member(project_id));
drop policy if exists "Members read project tasks" on public.project_tasks;
create policy "Members read project tasks" on public.project_tasks for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Leads create project tasks" on public.project_tasks;
create policy "Leads create project tasks" on public.project_tasks for insert to authenticated with check (created_by=auth.uid() and public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R']));
drop policy if exists "Assignees update tasks" on public.project_tasks;
create policy "Assignees update tasks" on public.project_tasks for update to authenticated using (assignee_id=auth.uid() or public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R']));
drop policy if exists "Members read sessions" on public.studio_sessions;
create policy "Members read sessions" on public.studio_sessions for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Leads manage sessions" on public.studio_sessions;
create policy "Leads manage sessions" on public.studio_sessions for all to authenticated using (public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Engineer'])) with check (public.has_project_role(project_id,array['Super Admin','Admin','Project Lead','A&R','Engineer']));
drop policy if exists "Users read notifications" on public.notifications;
create policy "Users read notifications" on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists "Users update notifications" on public.notifications;
create policy "Users update notifications" on public.notifications for update to authenticated using (user_id=auth.uid());
drop policy if exists "Members read track contributors" on public.track_contributors;
create policy "Members read track contributors" on public.track_contributors for select to authenticated using (
  exists(select 1 from public.tracks t where t.id=track_id and public.is_project_member(t.project_id))
);
drop policy if exists "Members read session participants" on public.session_participants;
create policy "Members read session participants" on public.session_participants for select to authenticated using (
  exists(select 1 from public.studio_sessions s where s.id=session_id and public.is_project_member(s.project_id))
);
drop policy if exists "Members read project assets" on public.project_assets;
create policy "Members read project assets" on public.project_assets for select to authenticated using (
  visibility='public' or public.is_project_member(project_id)
);

drop policy if exists "Project members read beat audio" on storage.objects;
create policy "Project members read beat audio" on storage.objects for select to authenticated using (
  bucket_id='beat-audio' and exists(select 1 from public.beats b where b.audio_path=name and public.is_project_member(b.project_id))
);
drop policy if exists "Creators upload beat audio" on storage.objects;
create policy "Creators upload beat audio" on storage.objects for insert to authenticated with check (
  bucket_id='beat-audio' and public.has_project_role(((storage.foldername(name))[1])::uuid,array['Super Admin','Admin','Project Lead','A&R','Producer'])
);

grant execute on function public.claim_beat(uuid,text) to authenticated;
grant execute on function public.release_beat_claim(uuid) to authenticated;


