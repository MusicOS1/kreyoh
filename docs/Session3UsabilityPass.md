# Session 3 correction and usability pass

28 October 2026 · MusicOS1/kreyoh · `feat/session3-creative-production` · PR #20

## Changes and root causes

| Area | Root cause | Correction |
| --- | --- | --- |
| Missing studio sessions | The participant query used an ambiguous `profiles` relationship after an attendance recorder relationship was added. PostgREST rejected it, and the page discarded the error. Dashboard queries also counted a different date/access scope. | Specify the participant user foreign key. Use one project and participation scoped loader for lists and counts, including historical records. Show query errors explicitly. Retain the existing role/participant access boundary. |
| Session navigation | Generic links lost the record target; some professional menus omitted Sessions. | Add Studio Sessions to the relevant workspaces and exact `#session-ID` links. The compact browser opens the matching details and page. Cross-project dashboard and notification links use the existing project-entry route. |
| Production artist | The audio-list label was derived from the uploader profile. | Read primary and featured artists, producers and other contributors from track credits. Display the uploader separately. Show documented master-rights evidence or “Not documented”; no ownership, credit or split records are rewritten. |
| Professional dashboard | It exposed only a small preview query and repeated track sections, without a searchable catalogue browser. | Load all permitted catalogue rows in database batches; show ten compact rows per page with title/code search, status, sorting, count and Previous/Next. Apply the browser to the role-specific professional dashboard and professional credit record. Keep children mounted when hidden. |
| Finance | Detailed membership, reconciliation and budgeting controls dominated the first view. Historical list queries had fixed caps. | Default to actual KES money received, paid expenses, available balance and committed expenses. Provide a compact searchable all-history list and expandable income/expense form. Keep detailed tools at `/finance?view=details`. Batch ledger reads beyond 1,000 rows. |
| My Workspace / Project Room | Both pages repeated shared project summaries. | My Workspace now presents the signed-in person's tasks, sessions, approvals, credited tracks, notifications and next action. Project Room retains shared tracks, people, progress and history, and links to personal work. Both read existing authoritative tables. |
| Help | A small textarea and large topic cards competed with asking a question; generic background transport could return no usable answer. | A large expanding textarea, visible action, compact expandable topics and readable answers use scoped component styles. Submit through the existing help server action, retaining its guide/AI logic and safety checks, with a visible transport error. |

No database migration is required. No public homepage/header, fan portal, artist profile, music player, login/authentication, legal page or Control Room implementation was edited. No global stylesheet was changed.

## Existing records preserved

Live database inspection was read-only. The four existing studio sessions remain in project `3bbead35-ed53-4507-9943-ff6255b0f1ce`: 24, 28 and 29 August, and 12 September 2026. All four are currently stored as scheduled and have no participant rows. Past dates were not treated as proof of completion or attendance. Access remains limited to existing coordination roles, the creator and explicitly assigned participants/engineer/producer/A&R.

Before/after fingerprints of the inspected live records matched:

| Record set | Count or fingerprint |
| --- | --- |
| Studio sessions | 4; MD5 `7ee08f3803867a4ee32e991d1a4e4596` |
| Project expenses | No rows; null fingerprint |
| Revenue records | MD5 `9133d61471e0a9bf68a1d9d6c98a7faa` |
| Membership transactions | MD5 `50dff809142db5c3f18e14cebf18f768` |

The existing KES 2,000 membership arrangement, membership accounts, transaction histories, budgets, reports, files and original session notes/history are retained. Expected membership revenue is not presented as cash received. The simple form inserts through existing income/expense actions with the same administrator boundary, validates project references and records an audit event. Isolated browser tests verify that original financial and session rows remain unchanged after fixture transactions.

## Browser evidence

These are screenshots from a local production build using an isolated disposable database and authorised fixture accounts, not live customer acceptance. Captures show the page content; the shared header/sidebar is cropped out. Separate existing regression suites cover those shared surfaces. Fictional catalogue and finance values are test data.

| View | Evidence |
| --- | --- |
| Sessions | [Desktop](session3-usability/Sessions.png), [mobile](session3-usability/SessionsMobile.png) |
| Production, separate artist/uploader | [Production](session3-usability/Production.png) |
| Professional dashboard, 106 tracks | [Desktop](session3-usability/ProfessionalDashboard.png), [mobile](session3-usability/ProfessionalDashboardMobile.png) |
| Finance | [Desktop](session3-usability/Finance.png), [mobile](session3-usability/FinanceMobile.png) |
| My Workspace | [Mobile](session3-usability/Workspace.png) |
| Project Room | [Desktop](session3-usability/ProjectRoom.png) |
| Help | [Desktop](session3-usability/HelpDesktop.png), [mobile](session3-usability/HelpMobile.png) |

## Validation

- Repository tests: 142 passed, zero failed.
- TypeScript: passed.
- Next.js production build: passed.
- Dependency audit: zero vulnerabilities.
- New usability suite: eight groups passed in the production build, including four historical sessions, failed-query handling, 106-track pagination/search/sort, independent artist/uploader labels, actual finance form actions and calculations, personal/shared work separation, and desktop/mobile Help submission.
- Existing Session 3 production suite: 14 scenarios passed, including multipart retry/registration recovery, approvals, release invalidation, private playback/history, permissions and explicitly recorded attendance.

- Existing session, authentication, playback and professional workspace suite: 37 checks passed.
- Compact cards and failed background interactions: four groups passed.
- Public homepage and route isolation: 14 groups passed.
- Shared public header: 140 anonymous/signed-in route and viewport combinations passed.

## Preview and acceptance boundary

Preview branch alias: [Session 3 preview](https://kreyoh-git-feat-session3-c-1a2b8a-fackts-africa-groups-projects.vercel.app).

This pass stays on the existing branch and PR #20. It does not merge to `main` or promote production. Final live account and real R2 acceptance remain outstanding; local fixtures and read-only live record checks do not establish those. Protected preview access requires the owner's existing Vercel access. No protection bypass or public sharing link was created.

## Exact local commands

From the repository root, use Node 22 or later:

```bash
npm ci
npm audit
npm test
npm run typecheck

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-test-publishable-key \
SUPABASE_SERVICE_ROLE_KEY=local-test-service-key npm run build

npx playwright install --with-deps chromium
AUDIT_PRODUCTION=1 node tests/browser/session3-usability.mjs
node tests/browser/session3-production.mjs
node tests/browser/session-repair.mjs
node tests/browser/interaction-cards.mjs
node tests/browser/homepage-audit.mjs
node tests/browser/public-header.mjs
```

Run browser suites sequentially; their disposable services use ports 3100 and 54329. Each suite creates and cleans its own isolated services. The production usability suite expects the fixture-configured build above. The other suites start their own development server. For this workspace's custom Chromium installation, prefix browser commands with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/tmp/usability-chrome`; a normal Playwright installation does not need that override. Live Supabase/R2 credentials are not required for fixture tests.
