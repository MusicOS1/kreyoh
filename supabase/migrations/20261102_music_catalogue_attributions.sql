-- FACKTS music catalogue attribution, distinct from upload permissions.
-- Artist or administrator can upload project demos or approved releases.
-- Uploader identity never implies performer credit or master ownership.
create table if not exists public.music_catalogue_attributions (
 id uuid primary key default gen_random_uuid(),
 release_id uuid unique references public.music_releases(id) on delete cascade,
 track_id uuid unique references public.tracks(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 upload_origin text not null default 'unknown' check(upload_origin in ('artist_upload','admin_upload','unknown')),
 uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
 credited_artist_profile_id uuid references public.profiles(id) on delete set null,
 credited_artist_name text,
 ownership_kind text not null default 'unverified' check(ownership_kind in ('unverified','artist','company','third_party','shared')),
 rights_holder_name text,
 rights_evidence_reference text,
 verification_state text not null default 'needs_review' check(verification_state in ('needs_review','verified')),
 attribution_note text,
 created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint music_catalogue_one_source check ((release_id is not null) <> (track_id is not null)),
 constraint music_catalogue_verified_rights check (
   verification_state <> 'verified' or
   (ownership_kind <> 'unverified' and nullif(btrim(coalesce(rights_holder_name,'')),'') is not null
     and nullif(btrim(coalesce(rights_evidence_reference,'')),'') is not null)
 )
);
create index if not exists music_catalogue_attributions_project on public.music_catalogue_attributions(project_id);
create index if not exists music_catalogue_attributions_artist on public.music_catalogue_attributions(credited_artist_profile_id);
alter table public.music_catalogue_attributions enable row level security;
revoke all on public.music_catalogue_attributions from anon,authenticated;
-- Only the server-side service role may read or modify this attribution register.
-- Existing fan and artist catalogue views remain unchanged.
comment on table public.music_catalogue_attributions is
'Explicit source (project demo vs public release), performer credit and rights ownership. Upload origin is provenance, never a rights claim.';
