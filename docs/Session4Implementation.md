# Session 4 — Release and audience workflow

31 October 2026. Branch: `feat/session4-release-audience`. Based on accepted Session 3 `b19ba3193d2befb1a8329f81e1e17a42560dc16a` (draft PR #20).

## Result

An authorised project lead or approved recording artist can prepare an existing project track for release, select approved artwork, record release permission and an EAT release date, and submit the approved master without uploading it again. The existing music administrator can request changes, approve the current revision and explicitly publish or schedule it. Public listeners use the existing persistent player, artist profiles, follow/save controls, playlists, Billboard votes, comments and sharing.

## Existing systems retained

- Existing `music_releases`, release upload/import/review, R2 media, Billboard and fan library are reused. Linked project releases use a revisioned workflow; legacy releases retain their existing path and rights checks.
- The recording artist is explicitly linked to approved project credits, independently of the uploader. Featured artists are also explicit. Legacy name matching remains conservative.
- Approved production masters and artwork are copied server-side into release-specific keys that have no client upload capability. Large masters support multipart server-side copying. The original production objects remain private.
- Submission records source readiness; approval and publication recheck it. New production evidence invalidates public eligibility until reviewed again. Scheduled releases remain private before their release time, with UTC storage and EAT display.
- Release campaigns add eight tasks to existing project tasks, with retry deduplication. These campaign tasks do not invalidate production sign-off.
- Engagement reports count recorded followers, saves, eligible weekly votes and comments. No fabricated play counts, royalty balances, DSP delivery or legal clearance are introduced.
- Public artist history is restricted to approved public releases; unpublished private project track names are excluded.
- Project selection, Finance, approved global styling, homepage, header, authentication and the persistent player implementation are retained.

## Permission boundaries

Workflow commands require an active confirmed account, actual project membership and the permitted project role or explicit music-administration grant. Review authority is independent of professional identity. Mutation, requirements, analytics, vote and playlist RPCs are server-only; the audit table has RLS and no browser grants. Updates lock the source project and reject stale revisions; audit writes and notification writes share the database transaction. Unpublished media is restricted to active owners/submitters or authorised reviewers.

## Validation evidence

Current automated tests: 147 passed, including isolated PostgreSQL release lifecycle, stale review, future privacy, source invalidation, audit rollback, role denial, duplicate request/notification handling and playlist ownership/order preservation. TypeScript passes. Dependency audit reports zero vulnerabilities.

Chromium development-mode release acceptance: seven end-to-end groups passed with no page errors. These cover preparation, R2 protocol copies, unpublished-media denial, forged approval denial, requested revision and explicit publication, artist association, follow/save/playlist, persistent playback, votes/comments/share, engagement and campaign tasks. Desktop, tablet and mobile captures are real browser screenshots of synthetic records.

Production-mode release acceptance also passed all seven groups after building with the isolated public Supabase settings used by CI. The first local production build omitted those browser settings and could not open the Control Room; rebuilding with the fixture configuration resolved it. A stale Turbopack persistence cache was cleared during local build recovery; no application dependency or build configuration was changed.

## Rollout and open acceptance gates

The migration `20261029041845_release_audience_workflow.sql` is a local candidate only. This turn has not applied any live schema, data, permissions or approvals, and has not merged any website PR. Preparing SQL is not rollout approval.

The new project-release screen will show setup pending against a backend without that migration. A Vercel READY status alone does not make the new database workflow available.

Before full owner acceptance: approve a concrete database rollout, run genuine account/RLS acceptance, validate external R2 copying/range delivery/CORS and large transfers, and review real Project 001 release evidence. Existing Session 2 deferred administrator/account checks remain open for after all five sessions.

## Local review

```bash
git fetch origin
git switch feat/session4-release-audience
git pull --ff-only origin feat/session4-release-audience
npm ci
npm run dev
```

Select the intended project, open Production, then Project releases. The existing independent upload remains available via Artist → Releases. The new linked workflow needs the approved database rollout described above.

## Browser screenshots

These are local production-build captures using synthetic accounts, project records and storage, not real Project 001 release acceptance.

- [Release preparation, desktop](session4-evidence/ReleasePreparationDesktop.png)
- [Requested changes, mobile](session4-evidence/ChangesRequestedMobile.png)
- [Published review, mobile](session4-evidence/PublishedReviewMobile.png)
- [Public artist, desktop](session4-evidence/PublicArtistDesktop.png)
- [Public release, desktop](session4-evidence/PublicReleaseDesktop.png)
- [Public release, tablet](session4-evidence/PublicReleaseTablet.png)
- [Public release, mobile](session4-evidence/PublicReleaseMobile.png)
- [Release actions and engagement](session4-evidence/ArtistEngagementDesktop.png)
- [Release-browser result groups](session4-evidence/Results.json)

The CI workflow now includes the Session 4 branch, stacked PR base and production-mode release suite, and uploads its screenshots with the existing browser evidence.

## Read-only connected database check — 31 October 2026

The verified Fackts Music project is `ijczdvlbeikfozgkezgb`. Project 001 currently contains 39 tracks, 71 beats, **5 sessions**, **16 membership transactions** and 1 revenue record. The session and transaction totals are newer than the older four-session/15-transaction audit baseline. This turn performed only SELECT queries and did not create, edit, delete or migrate these live records; the current figures must not be described as a matching old fingerprint.

Across the existing release table, 10 releases are published and 1 is draft. All 11 have a rights-confirmation timestamp, so requiring that timestamp for legacy public eligibility would not hide any of the 10 existing published releases on that criterion. This check does not establish real R2 media or account acceptance.

## Final local regression results

| Check | Result |
|---|---|
| Automated tests | 147 passed |
| TypeScript and standard optimized Next.js build | PASS |
| npm audit | 0 vulnerabilities |
| Session 4 release/audience, production mode | 7 groups passed |
| Session 3 selected-project recovery, production mode | 11 groups passed |
| Session 3 usability | 8 groups passed |
| Session 3 production and 272 MiB upload recovery | 14 scenarios passed |
| Session 2 onboarding and collaboration | 19 scenarios passed |
| Session/playback/workspace persistence | 37 checks passed |
| Compact card/background interactions | 4 groups passed |
| Approved homepage | 14 groups passed |
| Shared public header | 140 combinations passed |

[All nine browser suite exit results](session4-evidence/RegressionResults.json). CI status and deployment readiness must be checked independently after publication. Local fixture acceptance is not live-service acceptance.
