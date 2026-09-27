# Member experience and split workflow rollout

This branch fixes authentication callbacks, simplifies member navigation, gives each song a clear route into its credits and splits, and introduces a navigation helper. Existing project, audio and vote data is retained.

## Deployment order

1. Confirm the target is the database used by **music.facktsafrica.co.ke**. The account connected during development did not expose an identifiable Music project; no remote database was changed.
2. Apply these two new SQL migrations in order through the Music project's normal migration process or SQL editor:
   - `supabase/migrations/20260927173036_member_split_workflow.sql`
   - `supabase/migrations/20260927173946_music_helper_usage.sql`
3. Deploy this branch immediately afterwards and refresh open member tabs. Old server actions do not participate in the new versioned workflow; do not allow mixed old/new application versions to keep editing splits.
4. Check one invitation, one password-reset email and one complete split proposal with test member accounts. Confirm `NEXT_PUBLIC_SITE_URL` is the Music domain and Supabase allows its callback URL.

The SQL retains existing split rows on installation. Editing an allocation afterwards saves the entire proposal atomically, records its previous rows in `platform_events`, and resets every approval. Database writes through browser credentials are disabled; all writes use the server-only RPC with verified active membership and management/contributor checks. The current proposal's version prevents stale browser tabs approving revised shares. Track rights clearance is updated in the same transaction.

The first migration expects the repository's existing rights, notifications, profile and track-record migrations to be installed. It is transactional: missing prerequisites roll back the migration. It should be applied once, with migration history recorded by the normal release process. Do not rerun all old migrations blindly.

## Member behaviour

- Home shows outstanding actions and projects; each action opens the correct project.
- Main links: Home, My Projects, Inbox, My Profile.
- Project links: Overview, Team, Music, Sessions, Tasks, Credits & Splits. Secondary pages remain under More.
- Music titles open the song record; song navigation links to audio/versions and its exact split proposal.
- Splits have a searchable song list, a full-proposal review, an editable allocation table, a total, explicit errors and personal confirmations/change requests.
- Project Admin is accepted by the new split workflow; other existing management permissions are unchanged.
- `/help` offers built-in guidance and direct links. The helper cannot alter project data or approve splits.

## Optional AI answers

Built-in guidance works without an AI provider. To enable AI navigation answers, set these **server-side** deployment variables:

- `FACKTS_AI_HELPER_ENABLED=true`
- `OPENAI_API_KEY` to a dedicated project key
- `OPENAI_HELPER_MODEL` to an available Responses-compatible text model

No key or model was supplied during implementation, so no paid AI calls were made and AI is off by default. Use the provider's project budget controls before enabling. AI sends the member's question, static navigation instructions and current project role labels; it does not attach names, song files, finance data or split values. Responses are requested with `store:false`. Members are told their question is sent to the AI service.

AI access requires active project membership and is capped at 20 requests per member per database day. The quota is reserved atomically in PostgreSQL and cannot be bypassed by requesting a different application instance. Failed provider calls still count against this quota. Provider errors, missing configuration or quota limits return built-in guidance. History is not retained by the app; each question is answered independently.

Official API reference used: https://developers.openai.com/api/docs/guides/text

## Verification

- `npm test` runs navigation and mocked AI request tests, plus the actual migration/RPC in isolated PostgreSQL through PGlite.
- `npm run build` validates TypeScript and the production Next.js build.
- Database tests cover role checks, invalid totals, duplicate contributors, exact 100% sending, stale proposals, own-share approval, revision resets, rights synchronisation, change requests, rollback, browser privilege denial and AI quota enforcement.
- Live authentication, email delivery, production database schema and visual mobile behaviour still need deployment verification. No authenticated browser session was available here.

## Recovery

If deployment needs to be paused, keep split writes unavailable until the matching app and migration are installed. Do not re-enable the old contributor UPDATE policy: it allows ownership edits with browser credentials. The prior rows for each edit are preserved in `platform_events.metadata.previous_rows` for an administrator's reviewed recovery. No automatic destructive rollback script is included.
