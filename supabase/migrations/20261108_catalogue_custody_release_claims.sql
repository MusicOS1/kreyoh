-- Separate platform catalogue custody from performing-artist credit.
-- artist_id is a LEGACY submitter/account field; it must not establish a performance credit.
-- No audio, project room, revenue, or split record is moved or deleted.
alter table public.music_releases
  add column if not exists is_platform_managed boolean not null default false;
alter table public.music_releases
  add column if not exists uploaded_by_profile_id uuid references public.profiles(id) on delete set null;
create index if not exists music_releases_managed_catalogue_idx
  on public.music_releases (created_at desc, id) where is_platform_managed;

-- Existing verified professional-credit workflow becomes addressable by public release ID.
alter table public.professional_credit_claims
  add column if not exists release_id uuid references public.music_releases(id) on delete set null;
create index if not exists professional_claims_release_queue_idx
  on public.professional_credit_claims (release_id, verification_status, created_at desc)
  where release_id is not null;
create index if not exists professional_claims_artist_release_idx
  on public.professional_credit_claims (claimant_id, verification_status, release_id)
  where release_id is not null;
create unique index if not exists professional_claims_one_live_release_role_idx
  on public.professional_credit_claims (claimant_id, release_id, lower(btrim(contribution_role)))
  where release_id is not null and verification_status <> 'withdrawn';

-- Strict historical repair: only FACKTS-branded items uploaded via the legacy Joseph account.
-- Do NOT infer that other releases tagged Joseph, such as Nimeenda Hivi Nakam,
-- are incorrectly credited. Their named artists require separate per-release verification.
update public.music_releases r
  set is_platform_managed = true,
      uploaded_by_profile_id = r.artist_id,
      artist_name = 'FACKTS Music'
where r.artist_id = '27ccbdf0-6561-4c13-a846-3844c2deab40'::uuid
  and lower(btrim(r.artist_name)) = 'fackts music';

-- Capture provenance, never confer performing/ownership rights by bulk backfill.
insert into public.music_catalogue_attributions
  (release_id, upload_origin, uploaded_by_profile_id, ownership_kind, verification_state, attribution_note)
select r.id, 'admin_upload', r.uploaded_by_profile_id, 'unverified', 'needs_review',
 'Legacy FACKTS Music catalogue managed by administrators. Performing contributors and master rights must be verified separately.'
from public.music_releases r
where r.is_platform_managed = true
on conflict (release_id) do nothing;

-- Preserve every existing column and append an explicit custody signal to the public read model.
create or replace view public.music_weekly_chart with (security_invoker = true) as
select r.id, r.artist_id, r.title, r.artist_name, r.collection, r.track_number,
 r.genre, r.description, r.credits, r.explicit, r.debut, r.release_at, r.created_at,
 (r.cover_key is not null) as has_cover, count(v.user_id)::integer as votes,
 r.is_platform_managed
from public.music_releases r
left join public.music_votes v on v.release_id = r.id
 and v.week_start = date_trunc('week', now() at time zone 'Africa/Nairobi')::date
where r.status = 'published' and r.release_at <= now()
group by r.id;
revoke all on public.music_weekly_chart from anon, authenticated;
grant select on public.music_weekly_chart to service_role;

comment on column public.music_releases.is_platform_managed is
 'Admin-managed catalogue identity, NOT an artist credit, rights claim or royalty entitlement.';
comment on column public.music_releases.uploaded_by_profile_id is
 'Account that submitted/managed media, separate from performers; older non-managed rows may be unknown.';
comment on column public.professional_credit_claims.release_id is
 'Optional FACKTS public release being claimed; verified credit does not imply rights ownership or payment splits.';
