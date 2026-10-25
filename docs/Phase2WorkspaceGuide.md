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

## Owner feedback revision: responsive Follow

Follow/unfollow now uses a small JSON background request to `/api/fan/follow`, rather than invoking a client Server Action that participates in Next's navigation/action queue. The route reuses the existing authenticated, account-scoped follow validation and rejects cross-origin requests and invalid inputs. No page refresh or navigation is requested by the follow client.

The clicked artist changes immediately to the intended state. Pending requests are tracked per artist, so another artist's controls and unrelated library actions remain enabled. Duplicate clicks on the same pending artist are ignored. On a failed request, only that artist's previous state is restored and a retry message is displayed; other changes are preserved. Playback remains in the shared player.

Browser regression coverage deliberately holds a follow response open, checks the optimistic state and disabled control for that artist, verifies another artist remains enabled, then uses navigation/search and checks Save availability before releasing a failed response and checking rollback. Normal follow/unfollow persistence is still tested separately. Server endpoint tests check input validation and cross-origin rejection before any mutation.

Responsive Follow validation: 66 regression tests, TypeScript, production build, diff check and all 31 isolated browser scenarios passed. No browser page errors were recorded. The delayed-response/rollback scenario passed without blocking the unrelated controls checked above. Physical-device and live-account acceptance remain outstanding.

## Shared interactions and compact music cards

The owner reported page-wide waiting/blinking during song Likes and asked for the same isolated interaction pattern across role portals. The confirmed causes included a shared library busy flag, client Server Actions that could participate in the page action/navigation queue, explicit vote refreshes and whole-route messaging polls. This revision introduces a shared JSON/multipart background transport with an explicit server operation allowlist. Each operation retains its existing session, membership, role, resource and database checks. The endpoint rejects cross-origin requests, unknown operations and payloads above 1 MB; binary media continues through the existing signed upload controls.

| Surface | Implemented interaction behaviour |
| --- | --- |
| Listening, Likes and playlists | Optimistic account-library updates, pending state per song/playlist, duplicate protection and rollback for only the failed item. Playlist creation keeps its name on failure. Collection grouping is memoized rather than recomputed on every click. |
| Billboard votes | Immediate selection/count feedback with per-vote pending state and rollback; no whole-route refresh. Voting remains separate from Liking a song. |
| Public comments | Local lazy loading, posting, replies and deletion; retry feedback and retained drafts. Concurrent comment refreshes preserve locally deleted tombstones. |
| Creator listening/ranking | Background listening/rank writes; passive listening progress does not disable the ballot. Ballot saves update locally, preserving playback. |
| Project track notes | Background posting/deletion and a scoped notes read, with the existing project and Super Admin deletion checks. |
| Messaging in fan/creator shells | Conversation-only polling and read updates. Sending/blocking refreshes only that conversation. The composer keeps text on failure and newer drafts survive an earlier send. Peer changes remount the conversation boundary deliberately. |
| Inbox and notifications | Mark-one/all read stays local, including read indicators and a navigation-identity refresh for unread counts. It does not refresh the route. |
| Credits and split proposals | Existing RPC/version/approval rules remain unchanged. The proposal panel refreshes its own authorised rows/version/status after success so save → send → review can proceed without a page refresh. |
| Control Room catalogue | Metadata, thumbnail and credit saves stay in the affected editor; deletion removes that record locally and adjusts displayed totals. Existing confirmations and permission checks remain. |
| Control Room editorial/hero/release tools | Background form results remain local. Newly created editorial IDs are retained for subsequent edits. Release management keeps its confirmed operational status; bulk approval uses the returned actual approved count. |
| Shared help | The guide/AI helper uses the same background form transport and existing request permission/rate controls. |

The shared components are used by the fan, artist, producer, engineer, A&R, visual, management, studio and administrative shells. This table defines the implemented quick-action coverage. Authentication, workspace/project selection, new-record creation and upload-completion flows retain their existing navigation behaviour; native operational forms outside this table retain their established flow. No database migration, production record edit, permission assignment, payment automation or rights-workflow change is included.

Music cards use compact thumbnail-and-title layouts, two columns on wide desktop and one column on mobile. Play remains on the artwork. Like, Comment and Share are visible without opening More. Billboard voting is visible in the Billboard card. More contains waveform, playlist and follow options. Opening comments expands the affected card. The design uses existing content/artwork and truthful empty states.

Key implementation: `lib/backgroundInteraction.ts`, `app/api/interactions/[action]/route.ts`, shared listener/release/comment components, `lib/conversationSnapshot.ts`, `MemberConversation.tsx`, `ChatTimeline.tsx`, `NotificationReadButton.tsx`, `TrackNotes.tsx`, `SplitPanel.tsx`, `SplitPlanEditor.tsx` and the Control Room editor components. Existing route compatibility and root listening provider are preserved.

Validation uses isolated synthetic accounts/records. Expanded browser coverage deliberately holds and fails Like/vote requests, checks unrelated controls, confirms local rollback and saved Likes after refresh, posts/deletes comments and tests retained failed drafts. It verifies conversation-only message updates, the shared audio element, role switching and mobile overflow. Endpoint tests cover the operation allowlist, origin/payload boundaries, delegation to existing scoped mutations and project/track filters in split snapshots.

Live SMTP, R2, production-account roles/policies, physical devices and real moderation/approval acceptance remain manual checks. The fixture is not proof of every production write. Earlier development checks found a fixture single-release filtering bug and a generated Next cache failure; the fixture was corrected and the generated cache rebuilt before final verification.

Final verification: 74 regression tests, TypeScript, production build and diff checks passed. The full isolated browser suite passed 33 scenarios. The focused interaction harness separately checks optimistic vote rollback, failed-comment draft preservation and compact-card layout at 320/390/768/1440 px. Browser account/media records are synthetic. Native operational forms and new-record/upload completion flows retain the boundaries described above.

Actual implemented card screenshots (synthetic local records): [mobile](Phase2Screenshots/CompactCardsMobile.png) and [desktop](Phase2Screenshots/CompactCardsDesktop.png).

Reproduce the focused checks after the normal build/tests with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium node tests/browser/interaction-cards.mjs`, or omit the environment override when Playwright Chromium is installed. Run it separately from the full browser suite because both use the same isolated fixture ports. The harness scrolls the composer into view before clicking, avoiding smooth-scroll movement between pointer down/up.

The final focused harness passed all 3 checks with no page errors or duplicate-key/hydration warnings. Collection card keys now include the actual artist ID so artists with the same display name remain distinct. The final full-suite run passed all 33 scenarios. A blocked npm update-network check interrupted a runner handoff; final unit/build/focused checks were completed directly with Node using installed dependencies.


## V4 public homepage restoration

The root route `/` restores `app/page.tsx` verbatim from production `main` (Phase 1). Its hero, real imagery, creator ticker and public profiles, operating-layer cards, founding project, production workflow, conditional creator interviews, partnership band and footer remain intact. About, Partners and Contact retain their existing pages. No discovery feed or authenticated redirect replaces this page.

The original public header now links to About, How It Works, Creators, Explore Music, Partners and Contact, with Sign In and Join for visitors. Signed-in visitors see My Library, My Workspace (`/home`, using the existing authorised preference) and Continue Listening. The mobile menu uses the same destinations. Listening and workspace headers keep the Phase 2 account/workspace switcher; their brand and Public website link return to `/`. Discovery stays at `/listen`; fan collections stay at `/fan`. The persistent session and root listening provider remain in the shared root layout. Muted decorative videos no longer take music audio focus; audible media retain the existing single-playback behaviour.

### Registration and approval review

Signup records `creator_types` and a private/project-visible profile. This is a descriptive identity, not a privileged role application approval. Ordinary creative workspace presentation can follow those identities, while project data and operations continue to require active membership and server permission checks. A&R, Manager, Studio and coordination/control access derive from assigned roles or explicit administrative grants, not a selected signup profession. `app/people/actions.ts` restricts contributor onboarding and role assignment to authorised managers; invitation acceptance is scoped to the invited user and pending invitation. Workspace switching checks the server-derived options before changing a preference cookie; it does not create memberships or sign out the user.

A separate professional application queue with submitted evidence, reviewer assignment, approval/rejection reasons, applicant notifications and appeal/reapplication policy is not implemented by this correction. Product requirements must specify which professions need platform verification versus project-specific invitation, who may approve them, and whether verification is distinct from project privileges. No new approval rules, auth behaviour, migrations, or production data writes are included.

### Local inspection

In the VS Code terminal, from the existing repository folder:

```bash
git switch feat/phase2-unified-workspaces
git pull --ff-only origin feat/phase2-unified-workspaces
npm run dev
```

Keep the existing local environment configuration. Open `http://localhost:3000/`, `/listen`, `/fan` and `/home`. If a dev server is already running, stop it with Ctrl+C before restarting. No new launch script or dependency is needed.


Validation for this correction: 74 existing unit/regression tests passed; TypeScript and a normal production build passed. The extended full browser suite passed 36 scenarios, including logged-out `/` to `/listen`, signed-in `/`, persistent audio continuity across the public homepage, session recovery, deep links, nine role workspaces, workspace switching and revoked access. Four focused checks passed, including public navigation/brand visibility and overflow at 320/390/768/1024/1440px, compact card actions, optimistic vote rollback and failed comment draft retention. Original branding images loaded and local mobile/desktop screenshots were visually inspected. Browser checks use isolated auth/data/media fixtures, not production data. Real account/email/device/R2 acceptance remains as documented above.


## Premium design fidelity pass

The restored homepage content remains intact while a FACKTS-specific visual system refines type, navigation, menus, buttons, surfaces and spacing. See [PremiumDesignGuide.md](PremiumDesignGuide.md) for the hierarchy, self-hosted font licensing, navigation behaviour and interaction rules. Public discovery and authenticated workspace/account menus retain the same destinations and server permissions. The focused browser harness now covers keyboard menu entry, Escape and outside click, reduced motion, loaded custom fonts, account panel readability and compact music interactions.
