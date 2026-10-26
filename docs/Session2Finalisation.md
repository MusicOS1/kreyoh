# Session 2 owner acceptance report — 26 October 2026

Repository: MusicOS1/kreyoh. Branch: feat/session2-professional-onboarding. Draft PR #19 depends on #18. Preview-only; neither PR is merged.

**Closure status: FAIL / BLOCKED. Do not close Session 2 yet.** Local engineering verification passes. Real-account acceptance and administrator database safety rollout remain release gates. Synthetic fixtures are clearly separated from live verification below.

## Already implemented before this update

- Multi-profession professional applications, draft/submission/resubmission, Control Room review, feedback and status history.
- Existing platform administrator directory, scoped appointment/change/revocation forms and self-change protection.
- Existing project invitations, memberships, role assignments, tasks, studio sessions, tracks/private assets, credit claims and split workflows.
- Persistent authentication, workspace switching, background follow/like/comment actions and the persistent audio player.
- Approved public homepage, artwork, typography and universal public header.

## Outstanding findings and corrections

| Finding | Correction | Scope |
|---|---|---|
| Committed dependencies contained one critical and two high vulnerable packages | Pin Next 16.4.1; regenerate lock to Sharp 0.35.5 and source-map-js 1.2.2 | package.json, package-lock.json; other dependency changes are matching Next/Sharp platform packages |
| An approved applicant who registered as a listener still lacked their personal professional workspace | Merge approved professions into workspace identity at read time; retain stored profile and project/admin grants | professionalIdentity.ts, experienceIdentity.ts, returningUser.ts |
| Project Admin/Super Admin could inherit platform authority; empty grants inherited broad defaults | Require explicit active platform grants, remove project fallback and default broad permissions | controlRoom.ts, returningUser.ts; remove project-role exception from administrator management |
| Studio server actions accepted foreign session/track references or non-member participants | Validate selected session/track against selected project; validate participants and assignees against active membership; validate session update status | studioScope.ts and studio-sessions/actions.ts |
| Session status selector reset to its original value after a successful save | Remount only the selector when the saved status changes; assert both persisted and displayed values in production browser | studio-sessions/page.tsx, one key attribute; no styling change |
| Mobile dock became visible between field blur and form submit focus, covering the first action | Extend the existing focused-field visibility rule through workspace/main/Control Room form focus; keep the same audio element mounted | fan-premium.css; first-submit and audio-element browser assertions |
| Administrator changes and their audit insertion are separate requests; count checks are not transactional | Prepare database guards and transactional audit triggers, tested in isolated PostgreSQL | database/session2_admin_safety.sql — PREPARED, NOT APPLIED |
| Acceptance coverage consisted heavily of source assertions | Add actual multi-identity browser tests, executable server-action tests and real isolated PostgreSQL tests; enforce audit and browser regressions in CI | tests/, .github/workflows/verify.yml |

No homepage imagery/typography, public navigation components, legal content or portal layouts were changed. The shared mobile overlay rule in fan-premium.css was narrowly corrected for form submission: it changes visibility during form focus, without changing player markup, layout or audio state. Next 16.4.1 regenerated the AGENTS.md heading level; its instructions remain intact. No live data, grants, accounts, invitations, credits, music or project content were modified.

Security references checked on 26 October: [Next.js maintainer update](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [Sharp maintainer advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). No force audit fix or major framework upgrade.

## Local test results

| Check | Result | Evidence |
|---|---|---|
| npm ci | PASS | Clean installation from regenerated lockfile |
| npm audit | PASS | 0 vulnerabilities: info/low/moderate/high/critical all zero |
| npm test | PASS | 121 tests, including isolated application schema/audit and prepared administrator safety triggers, credit workflow and split SQL |
| npx tsc --noEmit | PASS | No TypeScript errors |
| npm run build | PASS | Optimized Next 16.4.1 production build |
| Session 2 real-browser suite | PASS | 19 scenarios against actual Next pages/Server Actions with separate synthetic identities |
| Existing session/playback/workspace suite | PASS | 36 browser scenarios |
| Interaction/card suite | PASS | 4 browser groups, background actions and responsive cards |
| Production homepage audit | PASS | 14 groups: approved geometry, seven widths, imagery, navigation, routes and emulated zoom |
| Production public-header audit | PASS | 140 anonymous/signed-in route/viewport combinations |
| Production Session 2 browser suite | PASS | 19 scenarios against optimized production build, including the saved selector state |

CI exposed a synchronization gap when retrying a simulated failed Like after mobile search input. The regression now waits for the visible failure and cleared busy state, blurs search, and centres the control before retrying; the rollback/persistence assertions remain. Mobile administrator evidence additionally waits for real non-overlapping header geometry and exercises the account menu before capture. Those synchronization/evidence changes did not change product code. A subsequent CI upload failure exposed the actual mobile dock focus defect described above; its existing CSS rule was corrected and the first-submit regression strengthened.

The browser suite uses real DOM/form interactions and the actual application server, with an isolated HTTP Supabase fixture. It verifies UI → Server Action authentication/authorization → REST requests → rendered feedback. It does **not** exercise real GoTrue credentials, deployed Supabase RLS, private cloud storage or delivery of external email. PostgreSQL tests separately execute actual committed SQL in PGlite; this is not a deployed multi-connection concurrency test.

## Professional onboarding acceptance evidence

1. An isolated listener signs in, fills the professional identity form and submits. Ownership comes from server-verified identity, not a submitted user_id.
2. A different isolated full administrator opens the Control Room queue and requests changes.
3. The applicant sees the exact feedback; a notification record is emitted for that applicant.
4. The applicant updates portfolio evidence and resubmits; old reviewer identity is cleared.
5. The reviewer approves; applicant sees Approved, feedback, status history and a locked final form.
6. The approved Artist personal workspace becomes available without rewriting the profile or adding a membership/grant.
7. Applicant cannot open the review queue; another account sees neither application nor feedback.
8. Direct server-action tests reject self-review, stale/final decisions and attempted edits after submission.
9. Actual isolated PostgreSQL verifies five status transitions, actor provenance, unique user/profession, RLS/grants, append-only service permissions and rollback on audit failure.

## Administrator controls

Browser verification covers the dedicated Platform administrators page, appointment by a full administrator, scoped changes, confirmation-based revocation, audit insertion, own-account protected state and desktop/mobile layout. Direct action tests reject scoped callers, self-removal and last-full removal before writes.

Read-only inspection of the existing FACKTS Music database found two active platform grants, one full grant, and one active legacy project Admin. Every legacy administrator already has an explicit active platform grant; there are zero legacy administrators without a corresponding grant. No user names, emails or credentials were needed, and no permissions were changed. This supports removing the fallback without relying on it to keep the observed accounts authorised.

**Remaining safety gate:** current application-level audit writes can fail after a permission change succeeds, and read-count/write is not a database transaction. The prepared SQL patch adds serialized governance changes and an audit trigger in the same transaction; audit failure rolls back permission changes. It preserves existing grants and blocks self-change, unauthorised actors and grant deletion. Existing application events can remain as supplemental records; the canonical trigger event is `control_room_access_changed` with previous/current grant snapshots.

The patch has NOT been applied to the shared/live database. It needs an authorised isolated Supabase environment, generated timestamped migration, advisor review and multi-connection cross-revocation test before owner-approved rollout. Until then, transactional administrator safety is **FAIL for deployed acceptance**, even though ordinary local appointment/revocation scenarios pass.

## Collaboration and authenticated experience

The Session 2 browser suite seeds an isolated pending invitation, accepts it through the existing UI, verifies the resulting membership and Producer assignment, opens the private project, schedules a recording as an assigned Engineer, records contributor feedback, assigns follow-up work and completes the session with outcomes. Private downloads remain denied to an unrelated account before and after the invitation is accepted. Invitation creation and external delivery are not claimed as real-service acceptance.

The executable credit workflow covers self-claimed work, owner-only evidence, independent collaborator confirmation, denial of self-confirmation and non-admin verification, and evidence-backed administrator verification. The existing SQL split workflow verifies validation, membership/management authority, 100% totals, notifications, confirmation, revisions invalidating old approvals, stale version rejection and atomic rollback.

The wider browser regression exercises registration/deep links, token refresh, browser restart, persistent playback, project/workspace switching, all nine professional workspaces, mobile controls, delayed follow/like/comment responsiveness, auth outage recovery, logout and private-cache behaviour with synthetic identities and media.

## Read-only database checks

The shared database has the professional application tables, RLS and transition trigger. anon/authenticated have no SELECT/UPDATE on application/event tables. Existing project invitation, membership, session, contributor, track and asset policies were inspected; reads are constrained by ownership/project membership, with public assets intentionally allowed. Table-level privileges alone are not an RLS bypass. No direct Data API access with actual test-user JWTs was performed.

## Genuine blockers and owner acceptance gates

1. **Real account acceptance unavailable:** no authorised isolated applicant/reviewer/outsider login credentials or test environment are available in this workspace. Complete the same flow with actual sessions and verify live RLS, status/notification delivery, workspace access and cloud file denial. Do not impersonate live users or seed fake records in their accounts.
2. **Administrator safety rollout pending:** apply the prepared, reviewed patch to an authorised isolated backend, exercise simultaneous changes and audit failure, then obtain owner approval for shared database rollout. Production schema remains unchanged in this update.
3. **Protected preview visual acceptance:** the existing Vercel preview requires the owner's Vercel session. Browser evidence here is local rendering, not a claim of remotely inspecting the deployed protected preview. No share link or protection change was created.

Closure requires these gates plus owner review. Local green checks do not substitute for real-account acceptance.

## Evidence and local reproduction

Browser evidence is in [session2-evidence](session2-evidence/). All records shown are synthetic. Screenshots use local production rendering with isolated synthetic records; the administrator mobile capture waits for settled responsive geometry. Representative screenshots: [approved applicant on mobile](session2-evidence/ApplicantMobileApproved.webp), [reviewer on desktop](session2-evidence/ReviewDesktopApproved.webp), [administrators on desktop](session2-evidence/AdministratorsDesktop.webp) and [mobile](session2-evidence/AdministratorsMobile.webp), [collaboration on desktop](session2-evidence/CollaborationDesktop.webp) and [mobile](session2-evidence/CollaborationMobile.webp). Results.json lists the 19 UI scenarios and REST write destinations, without credentials. The [mobile form-focus evidence](session2-evidence/MobileFormFocus.json) records the reproduced before/after visibility and mounted audio count. CI also uploads the full browser artifact directories.

Existing preview: https://kreyoh-git-feat-session2-p-291188-fackts-africa-groups-projects.vercel.app

VS Code terminal, from your existing repository checkout:

```bash
git fetch origin
git switch feat/session2-professional-onboarding
git pull --ff-only
npm ci
npm audit
npm test
npx tsc --noEmit
npm run build
npm run dev
```

Open http://localhost:3000. Use the existing authorised environment configuration for account testing; no secrets are included in this branch. Stop the previous dev server with Ctrl+C before restarting.

For isolated tests (the harness supplies synthetic credentials):

```bash
npx playwright install chromium
npm run test:session2
npm run test:browser
node tests/browser/interaction-cards.mjs
node tests/browser/homepage-audit.mjs
node tests/browser/public-header.mjs
```

Run browser harnesses sequentially; they share ports 3100/54329. Nothing in these harnesses sends email or writes to the real database. Do not run the prepared administrator SQL against production as a local test command.
