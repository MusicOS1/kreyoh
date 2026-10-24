# FACKTS Music V4 — unified workspaces preview

Prepared 24 October 2026. Branch: `feat/phase2-unified-workspaces`. Base: `6b595d4` (merged Phase 1).

## Architecture and findings

The existing system already has one Supabase identity, project membership and assigned roles, tracks, versioned media, sessions, documents, credits, split approvals, artist relationships, releases, fan libraries, messaging and permission-checked administrative tools. Phase 2 reuses those records and routes instead of creating parallel portals or tables.

The interface previously stacked a returning-user strip alongside separate public, fan, creator and admin headers. Professional navigation depended heavily on the currently selected project, despite members having roles across multiple projects. This preview replaces the duplicated chrome with a shared header, an account workspace switcher, contextual professional navigation and four mobile primary destinations. The existing root audio provider stays mounted across these changes.

`lib/workspaceExperience.ts` defines shared workspace presentation and project scopes. `lib/workspace.ts` supplies active memberships and assigned role names. `lib/experienceIdentity.ts` and `lib/returningUser.ts` supply verified navigation identity. `app/workspaces/actions.ts` checks the chosen workspace against current server-loaded options before saving a user-scoped HttpOnly preference. It selects an eligible existing project when needed. A preference never assigns a role or creates membership.

`lib/workspaceDashboard.ts` reads the existing records with explicit user/project filters. Privileged A&R, management, studio and coordination views require assigned roles; self-declared privileged profile labels do not qualify. Revoked memberships disappear from dashboard scope. Existing tool routes keep their own server permission checks. No migration, production data change, permission assignment, financial workflow change or new production dependency is included.

## Implementation map

| Files | Result |
| --- | --- |
| `components/ecosystem/GlobalHeader.tsx` and module CSS | Shared branded header; notifications, personal links, workspace switcher, install guidance and explicit logout in the account menu. |
| `components/ecosystem/EcosystemFrame.tsx`, `EcosystemShell.tsx` and module CSS | Desktop sidebar, mobile drawer, project context, mobile navigation, safe shrinking layouts and preserved workspace context on existing tool links. |
| `components/ecosystem/WorkspaceDashboard.tsx` and module CSS; `lib/workspaceDashboard.ts` | Reusable professional dashboard with role-specific records, actions, truthful metrics, empty states and unavailable states. |
| `app/workspaces/[kind]/page.tsx`, `loading.tsx`; `app/home/page.tsx` | Validated professional workspace routes and return to the permitted preferred workspace. |
| `components/AppShell.tsx`, `FanShell.tsx`, `ControlRoomShell.tsx`, `PublicNavigation.tsx`, `PublicNavigationClient.tsx`; `app/admin/(control)/layout.tsx` | Existing surfaces use shared identity and header while retaining their tools and administrative checks. |
| `components/SessionExperience.tsx`; `app/api/session/status/route.ts` | Removes duplicated returning strip; refreshes navigation identity and role options through the existing verified status endpoint. Phase 1 cookie/recovery logic remains. |
| `components/ListenerExperience.tsx` and module CSS; `components/ecosystem/PublicMusicPage.tsx`; `app/page.tsx`, `app/listen/page.tsx`, `app/fan/page.tsx` | Discovery-first public and member listening, search, real editorial photography, release cards, artist discovery, collections, library and existing community actions. Informational links remain in the footer. |
| `components/ListeningProvider.tsx`, `PersistentPlayer.module.css`, `app/fan-premium.css` | Compact gold/charcoal persistent player; corrected inherited oversized player layout; mobile position above primary navigation. Existing queue/restore controls remain. |
| `app/admin/control-room.css`, `app/admin/(control)/page.tsx` | Shared dark/gold identity, readable fields, truthful missing counts and exact online count alongside the existing tools. |
| `app/layout.tsx`, `next.config.ts` | Removes old workspace DOM-observer enhancer; explicitly labels local synthetic demo data; disables the development badge that intercepted mobile controls. |
| `.env.example`, `.env.demo.example`, `package.json`, `tests/helpers/demo-data.mjs` | Local setup examples, preserved existing CRM/AI configuration, optional isolated synthetic-data service. |
| `tests/workspace-experience.test.mjs`, browser/fixture and existing affected test files | Workspace scope, switch authorization, route context and complete browser regressions. |

## Role coverage

All accounts retain public discovery and listening. Multiple authorised roles appear in one account menu. Private tools remain subject to membership and the existing route permissions.

| Workspace | Implemented access and reused records | Backend limits |
| --- | --- | --- |
| Listener | Discovery, artists, releases, albums/EP collections, saved library/playlists, follow/vote/comments, queue and position restoration. | No offline music downloads; no invented external streaming metrics. |
| Artist | Projects, recordings, collaborations, credits/splits, release preparation, own release records, actual follower count and recent public feedback. | FACKTS publication does not mean external DSP distribution; no verified royalty pipeline added. |
| Producer/beatmaker | Existing own project-linked beats, recordings, upcoming sessions, stems/version metadata, production credits and splits. | No separate beat database, invented earnings or new licensing/disbursement system. |
| Sound engineer | Upcoming sessions, active recordings, uploaded versions/notes, track records, actions, credits and documents. | No inferred mix/master approval; existing version notes and track status remain authoritative. |
| A&R | Assigned-project repertoire, real A&R/revision comments, review meetings, track readiness, existing review tools and discovery. | Dedicated talent-shortlist and artist-development CRM models are not implemented. Existing evaluations are reused. |
| Visual creative | Assigned project rooms, real briefs/documents, visual MIME-filtered asset records, tasks, feedback routes and credits. Actual project-document upload and signed link tested. | Existing document upload is capped at 25 MB; external production-folder links are supported. No new large-video/resumable storage pipeline, shot-list table or per-edit approval history. |
| Manager/label | Explicit active manager relationships, permitted projects, planning, schedules, agreements, credits/splits and existing permission-checked financial records route. | Relationship assignment does not transfer rights or authorise every transaction. No new finance or payment logic. |
| Project coordinator | Existing project administration, projects, tasks, team, sessions, documents, reports and existing financial records route. | Existing management checks continue to govern mutations. |
| Writer/composer/session musician/other creative | Shared creative workspace for projects, recordings, contributions, sessions, professional record and credits/splits. | Job titles reuse common tools rather than granting new privileges. |
| Studio operations | Assigned studio projects, sessions, production files, existing studio insights and follow-up tasks. | No new booking, invoicing or studio billing engine. |
| Administrator | Shared account identity plus existing permission-filtered Control Room navigation and tools. | Only real admin grants/assigned admin roles qualify; no privilege changes were made. |

## Visual evidence

These are screenshots of the running Next.js app, not generated mockups. Their records/accounts/audio are synthetic, explicitly labelled at the top, and isolated from production. Photography and branding are existing repository assets. Empty states and zero counts belong to the fixture, not business performance. No reference images accompanied the brief, so the written near-black/charcoal/gold direction was implemented; pixel matching to unseen references cannot be claimed.

- [Listening desktop](Phase2Screenshots/ListeningDesktop.png)
- [Listening mobile](Phase2Screenshots/ListeningMobile.png)
- [Workspace switcher mobile](Phase2Screenshots/WorkspaceSwitcherMobile.png)
- [Artist desktop](Phase2Screenshots/ArtistDesktop.png)
- [Artist mobile](Phase2Screenshots/artistMobile.png)
- [Producer mobile](Phase2Screenshots/producerMobile.png)
- [Engineer mobile](Phase2Screenshots/engineerMobile.png)
- [A&R mobile](Phase2Screenshots/arMobile.png)
- [Visual creative mobile](Phase2Screenshots/visualMobile.png)
- [Manager mobile](Phase2Screenshots/managerMobile.png)

## Validation

Final local results:

| Check | Result |
| --- | --- |
| `npm ci` | Passed, 69 packages installed from the lockfile. |
| `npm test` | 63 passed, 0 failed, 0 skipped. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed using the normal Next.js production build. |
| `npm run test:browser` | 28 scenarios passed against isolated HTTP Supabase/storage/auth fixtures, Chromium and Android emulation. |
| `git diff --check` | Passed. |

The browser harness starts the actual Next development server, exercises registration instructions and a simulated confirmation callback, login/deep links, SDK refresh/cookie rotation, authenticated refresh, persistent browser-profile reopening, manifest entry and listening restoration without autoplay, explicit resume, network loss/recovery, service-worker offline navigation, transient auth outage, logout and revoked sessions. It checks one retained audio element through public/profile/professional navigation, all nine professional workspace switches, stale/revoked A&R denial, Control Room mobile rendering, actual project brief upload through the document form to fixture storage, signed file retrieval, mobile input focus and no document overflow at 320/390/768/1440 px. No browser page errors were reported.

Unit/SQL coverage includes existing auth, media/upload guards, library, comments, credits/splits, route validation, privileged profile-label rejection, project filtering, revoked/non-member exclusion, failed-record states, context links and rejection of unauthorised workspace preference writes. Lists retain bounded initial rendering and Show more; dashboard queries are bounded. A large production catalogue and high-volume performance were not load-tested.

Earlier development runs exposed a Next development badge blocking controls, inherited oversized player CSS and a corrupt generated build cache. The badge/config and player styling were repaired; generated cache was regenerated. The document browser test also waits for hydration before filling its form. The results above refer to final passing runs. No failing check remains in the final local run.

## Open locally in VS Code

Use Node.js 20.9+ and a current npm, matching the deployed Node runtime where possible.

```sh
git clone https://github.com/MusicOS1/kreyoh.git
cd kreyoh
git switch feat/phase2-unified-workspaces
code .
npm ci
```

For an existing checkout, fetch first, then switch to this branch without discarding local work.

### Option A: inspect safely with synthetic local records

Copy `.env.demo.example` to `.env.local` in a fresh local checkout. If you already have `.env.local`, back it up or use a separate checkout first. Do not commit `.env.local`.

Terminal 1:

```sh
npm run demo:data
```

Terminal 2:

```sh
npm run dev
```

Open `http://localhost:3000/login`. Sign in as `listener@example.test` with `Local test password 123!`. Open the account menu and choose a workspace. The local demo service binds only to loopback port 54329, stores changes in memory and resets on restart. It is a limited inspection fixture, not a Supabase replacement. Synthetic service-role values are test placeholders. Never deploy these values or the fixture service. The banner is rendered only in development with `LOCAL_DEMO_DATA=true`.

### Option B: use an authorised non-production Supabase project

Copy `.env.example` to `.env.local` and supply that project's Supabase URL, publishable key and server-only service-role key, plus `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Existing R2 values are required to test real project media; follow `FACKTS-Music-R2-Setup.md`. Apply the repository's existing migrations only through your established staging setup. This release adds no migrations. Keep service-role/R2 secrets server-only and never commit them.

```sh
npm run dev
```

Use authorised staging accounts and existing role assignments. Do not point an experimental fixture at production. In restricted environments, use `npm run dev -- --hostname 127.0.0.1`; navigate to `http://localhost:3000` consistently.

To reproduce automated checks:

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:browser
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` may point to an existing compatible Chromium. The harness uses isolated ports 54329/3100 and starts Next with webpack. The separate production build uses the normal build toolchain. Synthetic demo data service should be stopped before running the browser harness because both use port 54329.

## Remaining acceptance and integration work

- Real SMTP/email confirmation, Supabase production policies/session settings, account-specific permissions and signed R2 uploads/downloads still need authorised staging acceptance. Mock endpoint success is not proof of live infrastructure behavior.
- Physical Android Chrome, iPhone Safari, standalone installation/OS closure/reopening, keyboard geometry and background/lock-screen audio need device testing. Browser-profile reopening and manifest startup are simulated acceptance coverage only.
- The shared public music player persists across client-side navigation. Existing private review players remain workspace-bound. Browser autoplay restrictions and OS suspension still apply; Resume Listening is explicit.
- Dedicated visual shot lists/edit approvals, large-video/resumable uploads, expanded A&R CRM, external distribution, verified royalties, payments and legal rights automation require separate agreed backend/integration work. Existing routes are retained; unsupported workflows are not presented as completed automation.
- New dashboard reads are explicitly scoped server-side using the existing service-role architecture. Database RLS and production permissions were not changed. Existing platform advisor findings from Phase 1 remain separate follow-up work.

## Preview release boundary

One consolidated commit and one feature-branch publication; draft PR targets `main`. GitHub remains the source of Vercel preview deployment. The handoff supplies the exact PR, commit and preview URL after publication and reports the observed check status. No direct main push, merge, production deployment, schema update or production data mutation is authorised by this preview release. Explicit owner approval is required before merging.

## Owner feedback revision: Follow and artist access

Follow now validates the target against the same active, public artist-profile criteria used by discovery. Previously it required a matching release in `music_weekly_chart`, so a discoverable artist with no published releases could not be followed. The write remains authenticated, account-scoped and server-validated. Private, inactive and non-artist profiles are excluded. Unfollow remains available for previously saved records.

Follow controls in artist discovery now disable while saving and show confirmation/errors beside the artist area. The homepage artist highlights also display feedback next to their cards instead of relying only on the notice above the music sections.

The listening header now exposes an Artist workspace shortcut for accounts with an artist option, or My workspace for another permitted professional workspace. It links to the existing permission-checked dashboard; it does not assign roles. All authorised workspaces remain in the top-right account menu. Artist entry: `/workspaces/artist`. Account-specific role assignments still require authorised acceptance; no production profile or role is changed by this revision.

Added functional server-action regression coverage for following a public artist without releases and rejection of unavailable profiles/service failures. Browser coverage adds follow/unfollow persistence after refresh and direct artist entry at 320, 390, 768 and 1440 px using isolated fixtures. Real production account validation remains outstanding.

Revision validation: 65 unit/SQL/action tests passed; TypeScript, production build and diff checks passed. The final clean browser run passed 30 scenarios with no page errors. An earlier run reported a script syntax error while the development environment was being updated; the clean rerun did not reproduce it.
