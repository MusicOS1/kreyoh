# Session 3 — creative production

Work is based on Session 2 commit e666ce5, with PR #19 and its PR #18 dependency preserved. Session 2's deferred real-account acceptance and administrator safety rollout are separate gates.

## Initial audit and reuse

See [initial audit](Session3Audit.md), written before implementation. The implementation reuses projects, active membership/roles, beats/claims, tracks, studio sessions, tasks, project assets, contributor credits, split plans/approvals, rights checks, notifications and activity/event history. No duplicate project, track, split, rights, portfolio or collaboration modules were introduced.

## Working flow

Select a project from My Projects or the workspace project switcher, then open **Production room**. The command centre links to real beat assignments, people, sessions, tasks, documents, track records and split proposals. Its stage is an explicit project-coordinator decision; file counts do not advance it.

Register a track through the existing track intake or convert an existing reusable beat. A beat link records its source and producer; it never grants a purchase, exclusive licence, copyright or royalty liability. Existing beat claims/capacity and reuse behavior remain.

Upload an audio take, mix, master, stem, ZIP package, document or visual deliverable. Every uploaded asset starts **in progress**. Its uploader or project coordinator selects an independent, actively assigned Artist, Producer, A&R professional or project lead for review. Submission creates a version-specific task and targeted notification in the same PostgreSQL transaction as the review state and audit event. The reviewer requests changes or approves that particular file, with a note. Earlier versions and their decisions remain. A new version never inherits approval.

Review, stage and attendance controls use small JSON requests and per-form pending/error states. They do not replace the whole page, navigate away or disable other controls. Existing persistent public playback remains mounted. The established private project playlist supplies playback focus and the existing authorised file routes supply downloads.

Release readiness checks the **latest master** approval, track title/code, artwork, approved active contributors, current confirmed split plan with every share confirmed and a total of 100%, required rights/agreement evidence, optional recorded visual requirements, outstanding tasks/issues and explicit project-lead sign-off. The sign-off binds to a fingerprint of the actual supporting records; changed records require renewed sign-off. The new RPC and a database guard block older editing paths from bypassing release readiness. Operational readiness is not legal clearance or external DSP distribution.

The existing private professional record shows the uploader's approved deliverables only for projects where membership remains active. Nothing becomes a public credit or public asset automatically. Existing independently verified credit claims/public profile consent remain unchanged.

Control Room project overview shows read-only readiness per track using its existing project permission. Platform authority supplies no production approval, ownership or authorship.

## Necessary shared changes

- Workspace configuration adds one Production room link for professional workspaces. Existing components, styling, identity/session and project switching are retained; fan/admin menus are unchanged.
- Track intake and version forms use the multipart transfer engine. Original track credit, reusable beat and replacement modules remain in place. Recovery metadata for an initial track is scoped to its user/project and cleared when that track is completed in Production, so retrying does not register another track. New track registration cannot claim release-ready status.
- Existing track stage actions use the same transactional gate as Production.
- Studio views/actions restrict session details and contributions to coordinators/assigned participants, add explicit attendance and record status updates in activity history. Attendance defaults to unrecorded; no historical attendance is fabricated.
- Private asset downloads now also check uploader-private visibility. Track, passport and workspace asset lists use the same visibility predicate. Session summaries in project/workspace listings use the signed-in database client so session RLS also applies there.
- Track records link to authoritative production readiness; personal history and Control Room get narrowly scoped functional sections.
- No homepage, public header, fonts, artwork, fan design, global stylesheet, legal page, authentication or player implementation was edited.

## Database candidate

`supabase/migrations/20261026200516_creative_production_workflow.sql` was generated with the Supabase CLI. It is **not applied to any shared/live database**.

It adds one upload-transfer ledger, per-asset review/version metadata, per-track sign-off and explicit session-attendance columns. Existing assets receive an unapproved default. No existing creative records or permissions are rewritten. The ledger has RLS and no browser-role privileges; only authenticated server code accesses it. Workflow helpers are SECURITY INVOKER and executable only by service_role. They recheck actor membership, actual project role and target scope, serialize workflow operations per project and commit audit, notification, task and mutation atomically. Retry keys are checked against actor, project, action, target and payload.

One deliberately private SECURITY DEFINER boolean helper is necessary to avoid recursive session/participant RLS. It resides in the non-exposed fackts_private schema, has an empty search path, uses only schema-qualified references and always binds active membership/assignments to auth.uid(). It returns no session data. Anonymous/PUBLIC execution is revoked. Browser session writes are revoked in favor of existing authenticated server actions.

Session RLS now limits reads to relevant assigned users/coordinators. Asset RLS respects uploader-private visibility. Both are exercised with actual authenticated PostgreSQL roles in isolated tests. The track trigger prevents direct older write paths from claiming release readiness without current production approval.

The candidate requires isolated Supabase migration/advisor review and real-user acceptance before an owner-approved shared rollout. An environment without it displays a setup-pending notice and links to existing tools; the app does not silently manufacture readiness.

## Upload architecture and deployment requirements

The server creates an owner/project/track-bound upload ledger and an R2 multipart upload. Each browser request sends only one 16 MiB Blob slice straight to a short-lived signed R2 part URL. The application server never receives the audio/stem payload. Limits are 20 GiB per production file (audio and packages alike), with 24-hour transfer authorization; these are explicit operational bounds, not a 250 MB audio ceiling.

Each part retries up to three attempts. Reselecting the same file/settings resumes from the parts actually observed by R2; the browser persists only transfer ID and file metadata. Signed URLs/credentials/bytes are not persisted. Pause aborts the active transport while retaining completed parts. Discard aborts the owned multipart session. Expired/incomplete uploads must also be covered by the bucket's lifecycle policy.

Completion uses server-observed part numbers, byte counts and ETags, then verifies object size, content type and ETag before registering exactly one project asset transactionally. Lost completion/registration responses are recoverable. Completed multipart IDs cannot overwrite the published version through previously issued part URLs. Earlier files are never overwritten. The real AWS presigner regression verifies that a browser part URL does not carry the checksum of an empty server-side payload; the new multipart client uses WHEN_REQUIRED checksum calculation. Legacy R2 versions remain available and become reviewable after a conservative two-hour window (older track PUT links last at most one hour). Legacy mutable storage versions require a new production upload for review. The database guard prevents approving bytes that still have a live temporary write capability. ETags/storage metadata are recorded; they are not represented as a client-to-storage cryptographic content proof.

R2 must use a private bucket with correctly scoped credentials and CORS allowing the authorised app origins, PUT and Content-Type. Configure incomplete-multipart lifecycle cleanup. Actual service CORS, quota, long-duration mobile networks, 20 GiB capacity, external bytes/checksums and real signed audio/range delivery remain acceptance cases until tested against an authorised isolated storage environment. No external storage test may be inferred from local S3 protocol fixtures.

## Validation

**Engineering: PASS locally. Real-service/Project 001 owner acceptance: BLOCKED. Session 3 is not approved for production or final closure.**

| Check | Result |
| --- | --- |
| npm ci | PASS; verified existing pinned dependency/lockfile baseline |
| npm audit | PASS; 0 vulnerabilities |
| npm test | PASS; 135 tests |
| npx tsc --noEmit | PASS |
| npm run build | PASS; optimized production build |
| Session 3 production browser | PASS; 13 scenarios, no page errors |
| Session 2 browser | PASS; 19 scenarios |
| Sessions/playback/workspaces browser | PASS; 37 scenarios, including same-element playback into Production |
| Compact cards/background interactions | PASS; 4 groups |
| Homepage regression | PASS; 14 groups, seven widths plus emulated effective zoom |
| Shared public header regression | PASS; 140 anonymous/signed-in route/viewport combinations |
| Isolated full creative lifecycle | PASS; original beat claim, conversion, recording actions, credit approval and split RPC through production release sign-off |
| SQL security/integrity | PASS; actual PostgreSQL roles/RLS, outsiders, independent approval, stale revisions, atomic audit rollback, retry deduplication, current master/visual approvals, sign-off invalidation, private artwork and mutable legacy upload denial |
| Multipart protocol/browser | PASS; actual 272 MiB WAV file sliced into 17 parts, failed part retried (18 PUTs), failed registration recovered with no additional PUT and exactly one asset |
| Actual AWS presigner | PASS; key/upload ID/part bound; no incorrect empty-payload checksum |
| Design isolation | PASS; approved homepage/header, typography, imagery, global CSS, fan layout, legal pages, authentication and player implementation unchanged |

The new browser suite drives actual Next pages and JSON routes into an isolated PostgreSQL database running the actual candidate workflow functions. It also exercises a range-capable S3 protocol fixture through the actual R2 SDK. The signed media endpoint is checked before its synthetic R2 redirect is mapped to local fixture storage; no external storage success is inferred. Browser review actions use ordinary first clicks with no forced clicks or preparatory programmatic button focus.

The continuous lifecycle test loads the existing beat-claim SQL, invokes the original beat conversion, session and credit actions through the local REST adapter, then runs the existing split-plan function. It establishes an isolated project/membership fixture, claims one source beat (duplicate rejected), creates the linked song/producer and artist credits, schedules/completes recording and a contribution, registers stems, reviews/revises a mix, independently approves a master, verifies credits, proposes/sends/confirms both split shares, records explicitly synthetic supporting evidence and obtains current project-lead sign-off. Approved uploads are available in the contributor's private history. It does not establish real legal clearance or real creative activity.

All records/accounts/files in these tests are isolated synthetic fixtures. **No genuine Project 001 record, real administrator permission, live creator record, shared schema or production storage object was modified.** Supabase inspection was SELECT-only (existing schema/policies/role names). No PR was merged.

GitHub CI runs these checks on the feature branch/stacked draft PR; its published-commit status is linked in the PR. Local passing results alone are not presented as a remote CI result.

## Actual browser evidence

These are real Chromium screenshots of the local production build with explicitly synthetic records, visually inspected at desktop and mobile sizes. They are not screenshots of real Project 001 participants or of the deployed protected preview.

- [Production overview — desktop](session3-evidence/ProductionDesktopOverview.webp)
- [Approved master and readiness — desktop](session3-evidence/ProductionDesktopReady.webp)
- [Recovered 272 MiB transfer — desktop](session3-evidence/EngineerDesktopUpload.webp)
- [Production overview — mobile](session3-evidence/ProductionMobile.webp)
- [Artist revision and version history — mobile](session3-evidence/ArtistMobileRevision.webp)
- [Machine-readable browser results](session3-evidence/Results.json)

## Remaining acceptance gates

1. **Isolated Supabase rollout:** the candidate is tested in disposable PostgreSQL, but no authorised isolated Supabase preview database was provided. Apply and review it there, run Supabase advisors and verify real authenticated/outsider accounts. Do not apply it to the shared/live project as part of preview inspection.
2. **External R2:** an authorised isolated bucket/credentials/CORS environment is unavailable. Verify real multipart transfers, cancellation/lifecycle cleanup, checksums/byte integrity, range playback, quota and large-file/mobile-network recovery there. The 20 GiB limit is implemented and boundary-tested; only 272 MiB was actually transferred through the local protocol fixture.
3. **Genuine Project 001:** owner-approved real participants/files and permissions are still required for the 13-step commercial/creative acceptance case. No fictional attendance, contracts, royalties, ownership, credits or clearances were created in live data.
4. **Preview acceptance:** the repository's Vercel preview uses its configured backend. Until a dedicated preview backend receives the candidate migration, the new Production route displays setup pending and existing tools stay accessible. A READY deployment does not mean schema rollout or real-service acceptance passed. Protected remote preview visuals require the owner's Vercel session; local screenshots do not substitute for that acceptance.
5. **Session 2:** its deferred real-account acceptance and administrator safety patch rollout/concurrency checks remain separate and open. PR #19 and its PR #18 dependency remain unmerged.

## VS Code commands

In the existing kreyoh repository terminal:

```bash
git fetch origin
git switch feat/session3-creative-production
git pull --ff-only origin feat/session3-creative-production
npm ci
npm run dev
```

Open http://localhost:3000/ and http://localhost:3000/production. Keep the approved homepage accessible. Use an authorised project account and **isolated** backend configuration in your existing local environment file; the production workflow requires the candidate schema there. Stop an old dev process with Ctrl+C before restarting. No extra dev-server script is needed.

For isolated browser acceptance (uses synthetic local Auth/REST/PostgreSQL/S3 fixtures and does not seed your database):

```bash
npx playwright install chromium
npm run test:session3
```

For standard engineering validation:

```bash
npm audit
npm test
npx tsc --noEmit
npm run build
```

The test harness supplies its own synthetic service configuration. Do not copy fixture secrets into real deployment environments. Do not run a migration push against a production-linked Supabase project. Release approval remains with the owner.
