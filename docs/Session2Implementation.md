# FACKTS Music V4 — Session 2 implementation (preview only)

Current verification and release gates: [Session 2 finalisation report](Session2Finalisation.md).

## Architecture
Audited production on 24 October 2026. Existing source of truth: profiles, project_members/member_roles, project_invitations, project_join_requests, project_tasks, studio_sessions, project_assets, project_documents, track_contributors, professional_credit_claims, track_splits, music_releases and Control Room permissions. Existing tools continue to own those workflows; this branch does not duplicate project operations.

New: one identity-application row per user/profession, six explicit statuses, applicant editing and resubmission after changes requested, Control Room review/feedback and automatic append-only status event history. Two server-only tables are defined in database/session2_professional_applications.sql. The owner explicitly authorised applying the schema to the connected FACKTS Music database. That additive migration succeeded and both tables have RLS enabled with direct user grants revoked.

## Routes
- /professional-onboarding — signed-in applicant, multiple professions, draft, submission and reviewer feedback.
- /admin/professional-applications — existing Control Room 'people' permission required, real queue, decisions.
- Existing /invitations, /projects, /tasks, /studio-sessions, /professional-record remain the working collaboration and music operations system.
- Shortcuts in the account menu, Control Room sidebar and professional record.

## Permission boundaries
Selecting a profession or approval **does not grant membership, administrative access, financial authority or rights**. Control Room decisions require the existing people permission; self-review is disallowed. Applicant read/write requests verify Supabase identity server-side and restrict reads/edits to that user's record, with compare-and-swap updates. The SQL tables deny anon/authenticated direct API access; server actions use only a server-only admin client. The database trigger records state changes in the same transaction.

## Current database state and acceptance

At the owner's direction, the migration was applied directly to the existing FACKTS Music Supabase project. No separate staging project was created. Both tables and the audit trigger were verified; ordinary anon/authenticated users have no direct table privileges. The records are accessed only by server actions after verified user identity and role checks.

A transaction-only database check simulated submitted, under review, changes requested, resubmitted and approved transitions and verified five matching audit events. The test was rolled back: zero test applications and zero test events remain.

To complete real-account acceptance, use two DIFFERENT signed-in users with existing permissions. One must submit from /professional-onboarding; the reviewer must have Control Room 'people' permission. Verify feedback appears in the applicant history, no cross-account application appears, and no elevated project access is conferred by identity approval.

This is a working live database; test submissions using genuine records only when the owner intends them. Never create fictional credits or permissions.

## Known limits and deferred workflows
- Evidence is a validated external portfolio URL, not an uploaded identity document.
- Review is for a declared professional identity only, not a verified employment relationship.
- Existing invitations/role assignment, project tasks, audio versions, credits, splits and files are reused; no separate duplicate assignment pipeline was created.
- Payments, rights transfers, external DSP distribution, large-video upload and automated verified earnings are outside this session.
- Avoid deploying this feature to production without schema rollout and owner approval.

## Validation
Run npm ci, npm test, npm run typecheck, npm run build and optionally npm run test:browser, with the correct environment. The new tests cover role validation, transition policy, input validation and SQL safety characteristics; browser acceptance for the new routes and live Supabase mutation is still REQUIRED after staging setup.

For VS Code: checkout feat/session2-professional-onboarding, run npm ci, then npm run dev. All work remains preview-only until explicitly approved.

## Session 2 final UI fixes

- Separated GET profession switching from POST application submission to prevent accidental cross-profession field carry-over.
- Applicant and reviewer actions report errors/success inline with React action state; authorisation failures remain server-enforced.
- Applicant and Control Room screens show events from the actual application audit history.
- Workspace shell now bounds desktop width and sidebar horizontal overflow and includes an onboarding navigation link.
- The finalisation update pins Next 16.4.1 and commits patched Sharp 0.35.5 / source-map-js 1.2.2 in the lockfile, with a clean install and zero audit vulnerabilities. See the finalisation report for current test counts and genuine acceptance blockers.
- Approved professions now enable personal workspace navigation without granting project or platform authority. Platform permissions require explicit active administrator grants. Studio session, track and participant references are validated within the selected project.
- A transactional administrator safety patch is prepared and tested locally in `database/session2_admin_safety.sql`; it has not been applied to the live database. Real-account acceptance and safety rollout remain required before closure.
