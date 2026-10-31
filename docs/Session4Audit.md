# Session 4 implementation audit

29 October 2026. Accepted baseline: Session 3 `b19ba3193d2befb1a8329f81e1e17a42560dc16a`, draft PR #20 stacked on #19. Session 4 branch: `feat/session4-release-audience`; no production rollout authorised.

## Reuse

- `music_releases`, its dedicated R2 release copies, Control Room music permission, public media endpoint, weekly chart and one-vote-per-week RPC.
- Existing public artist profiles/directory, persistent listening provider/player, follow/save/recent/playlist library, compact comments and sharing.
- Session 3 production approvals, current-master readiness fingerprint, project membership, contributors, splits and rights checks.
- Project tasks, activity log and in-app notifications. Existing finance remains unchanged.

## Gaps and implementation boundary

- Release uploads are disconnected from private production: no source track/project/master relationship. Add a bridge to the existing release record and reuse the approved master securely, without a second upload.
- Artist account is assumed to be the uploader; name heuristics decide profile association. New project releases need explicit recording/featured artist IDs; preserve conservative attribution for legacy releases.
- Review has only draft/pending/published/rejected/withdrawn and one rights checkbox. Add versioned review metadata, change requests, explicit approval and a server-only transactional workflow. Keep existing published releases working.
- Bulk approval checks only one rights timestamp. Route new linked releases through the same readiness/revision checks as individual review; retain the existing legacy import path with its checks.
- Future public media is date-gated, but status labels and artist review need clearer EAT scheduling. Keep UTC storage, display EAT and enforce visibility at every public boundary.
- Public creator credits currently include unpublished private track titles. Restrict to verified public release material.
- Fan interactions and playlists already work; connect release/artist pages to those controls and the persistent player, rather than rebuilding the Fan Portal.
- Add scoped engagement counts for public releases, follows, saves, votes and comments. Do not count media HTTP requests as listens or invent play analytics.
- Campaign basics belong in existing project tasks linked to a release. No new CRM or finance module.

## Protection and validation

Read-only live Project 001 counts: 39 tracks, 71 beats, 4 sessions, 15 membership transactions, 1 revenue record. Starting row fingerprints are captured separately for a final read-only comparison. No live records, permissions or schema are changed by this audit.

Production schema changes will be prepared locally and tested in disposable PostgreSQL. They will not be applied without explicit owner approval. Full local browser acceptance will use synthetic identities, a local REST fixture and local storage protocol fixtures. Genuine Supabase login and external R2 acceptance must remain explicitly unverified unless authorised access becomes available.

Preserve all accepted layouts, global CSS, homepage, header and player. Add compact release-specific controls to existing destinations only. One coordinated publication and dedicated draft PR after local validation.
