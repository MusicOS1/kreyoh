-- FACKTS Music — Project Documents, Meeting Minutes and discoverable creator profiles
-- ADDITIVE migration. Does not touch voting tables, track votes or Project 001 vote records.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Make creator profiles discoverable by default.
-- Existing public profile pages only select public-safe identity/media fields.
-- This changes visibility only; it does NOT expose email, phone, finance,
-- project files, voting behaviour or internal notes.
-- ---------------------------------------------------------------------------

alter table public.profiles
  alter column profile_visibility set default 'public';

update public.profiles
set profile_visibility = 'public'
where profile_visibility is distinct from 'public';

-- ---------------------------------------------------------------------------
-- 2. Project documents and formal meeting minutes.
-- ---------------------------------------------------------------------------

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 220),
  document_type text not null
    check (document_type in ('meeting_minutes','brief','agreement','report','reference','other')),
  meeting_date date,
  attendees text[] not null default '{}',
  summary text,
  decisions text,
  action_items text,
  file_storage_key text,
  file_name text,
  file_mime_type text,
  file_size bigint,
  external_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_documents_project_created_idx
  on public.project_documents(project_id, created_at desc);

create index if not exists project_documents_project_type_idx
  on public.project_documents(project_id, document_type, created_at desc);

create index if not exists project_documents_meeting_date_idx
  on public.project_documents(project_id, meeting_date desc)
  where document_type = 'meeting_minutes';

alter table public.project_documents enable row level security;

drop policy if exists "Project members read project documents" on public.project_documents;
create policy "Project members read project documents"
  on public.project_documents
  for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members create project documents" on public.project_documents;
create policy "Project members create project documents"
  on public.project_documents
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_project_member(project_id)
  );

drop policy if exists "Creators or management update project documents" on public.project_documents;
create policy "Creators or management update project documents"
  on public.project_documents
  for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.has_project_role(project_id, array['Super Admin','Admin','Project Lead'])
  )
  with check (
    created_by = auth.uid()
    or public.has_project_role(project_id, array['Super Admin','Admin','Project Lead'])
  );

drop policy if exists "Creators or management delete project documents" on public.project_documents;
create policy "Creators or management delete project documents"
  on public.project_documents
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.has_project_role(project_id, array['Super Admin','Admin','Project Lead'])
  );

-- ---------------------------------------------------------------------------
-- 3. Private project document storage.
-- Files are opened through signed URLs generated inside the authenticated app.
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-documents',
  'project-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/octet-stream',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
