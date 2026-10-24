# FACKTS Music V4 — Session 2 implementation (preview only)

## Architecture
Audited production **read-only** (24 October 2026). Existing source of truth: profiles, project_members/member_roles, project_invitations, project_join_requests, project_tasks, studio_sessions, project_assets, project_documents, track_contributors, professional_credit_claims, track_splits, music_releases and Control Room permissions. Existing tools continue to own those workflows; this branch does not duplicate project operations.

New: one identity-application row per user/profession, six explicit statuses, applicant editing and resubmission after changes requested, Control Room review/feedback and automatic append-only status event history. Two server-only tables are defined in database/session2_professional_applications.sql. They **have not been applied** to the connected production project.

## Routes
- /professional-onboarding — signed-in applicant, multiple professions, draft, submission and reviewer feedback.
- /admin/professional-applications — existing Control Room 'people' permission required, real queue, decisions.
- Existing /invitations, /projects, /tasks, /studio-sessions, /professional-record remain the working collaboration and music operations system.
- Shortcuts in the account menu, Control Room sidebar and professional record.

## Permission boundaries
Selecting a profession or approval **does not grant membership, administrative access, financial authority or rights**. Control Room decisions require the existing people permission; self-review is disallowed. Applicant read/write requests verify Supabase identity server-side and restrict reads/edits to that user's record, with compare-and-swap updates. The SQL tables deny anon/authenticated direct API access; server actions use only a server-only admin client. The database trigger records state changes in the same transaction.

## Staging setup (MANDATORY before functional preview acceptance)
This branch is based on the current unmerged Phase 2 branch. The schema has NOT been installed anywhere. No automated local PostgreSQL staging database is available to this chat. Staging should use a non-production Supabase instance or isolated database:

1. Review database/session2_professional_applications.sql.
2. Use your installed Supabase CLI to create a properly timestamped migration, placing the reviewed SQL within that generated migration, then apply only to staging.
3. Inspect grants/RLS: anon and authenticated have no direct access to either table; service_role only on trusted server paths.
4. Test a real staging applicant, review via a separate authorised admin, and check history and notifications.
5. Compare against real signup, deep links, mobile, media and collaboration flows.
6. Do NOT apply production database changes without separate explicit authorisation and migration/rollback plan.

Until the schema is installed on a staging database, the preview will show an honest 'setup required' message, not a fake successful application.

## Known limits and deferred workflows
- Evidence is a validated external portfolio URL, not an uploaded identity document.
- Review is for a declared professional identity only, not a verified employment relationship.
- Existing invitations/role assignment, project tasks, audio versions, credits, splits and files are reused; no separate duplicate assignment pipeline was created.
- Payments, rights transfers, external DSP distribution, large-video upload and automated verified earnings are outside this session.
- Avoid deploying this feature to production without schema rollout and owner approval.

## Validation
Run npm ci, npm test, npm run typecheck, npm run build and optionally npm run test:browser, with the correct environment. The new tests cover role validation, transition policy, input validation and SQL safety characteristics; browser acceptance for the new routes and live Supabase mutation is still REQUIRED after staging setup.

For VS Code: checkout feat/session2-professional-onboarding, run npm ci, then npm run dev. All work remains preview-only until explicitly approved.
