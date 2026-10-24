# FACKTS Music V4: Phase 1 stability repair

Prepared 24 October 2026. Base: `f9ba953` on `MusicOS1/kreyoh`.

## A. Root cause findings

### Confirmed in the source

1. `public/sw.js` cached `/login` and `/admin/login` and returned those pages when navigation failed. This made an offline or interrupted request look like a sign-out, even when the browser still held a valid session. Its generic image cache could also retain personalized images; the replacement caches only the offline document and a public logo.
2. The proxy treated authentication-service exceptions and the workspace loader treated all `getUser()` errors as reasons to go to login. A connection failure is not evidence of an expired or revoked session.
3. The unauthenticated redirect and exception branches could discard the response carrying Supabase cookie changes. The normal authenticated login redirect already copied cookies; it was not universally broken. Refresh cookies, request cookies and cache headers now survive all branches.
4. Public navigation always offered sign-in/join actions. The installed app started at the public homepage, which did not provide a useful return path for an authenticated member.
5. Public listening was owned by `ListenerExperience`, so leaving that page unmounted the audio element. Queue, current track, progress and discovery context had no durable restoration.
6. Fan-only navigation classification could take precedence over active project membership. Control Room access denial also invoked sign-out, unnecessarily disrupting the music session.
7. GET requests could execute sign-out. A Control Room account-switch link used that route. GET is now a confirmation screen; only an explicit same-origin POST signs out.
8. The full song feed and the collapsed queue rendered every row. Failed library requests could leave controls busy. Existing mobile fields also used small text in several surfaces.

### Production evidence and limits

The connected Supabase project named **Fackts Music** is active and healthy. A read-only check of the available 24-hour authentication logs found 11 successful refresh-token requests, 12 successful `/user` requests and 13 successful JWKS requests. No failed authentication request appeared in that sample. This supports that refresh is operating; it does not prove the cause of every reported real-user logout.

The Supabase SSR package already supplies persistent cookies with a long maximum age. This repair preserves SDK-managed cookies and refresh tokens; it does not extend session policy, store tokens in custom storage or bypass authentication.

Production session time limits, inactivity settings, refresh-token revocation history outside the sampled logs, browser data deletion and device-specific cookie eviction remain unverified. The production homepage and login form were inspected without signing into a production account. Vercel runtime logs were not used.

## B. Repairs by file

### Authentication and session handling

- `lib/supabase/proxy.ts`: preserves refresh cookies and cache headers, forwards the refreshed cookie to server components, retains deep links, returns a retryable 503 for authentication outages, and verifies remote session validity before redirecting away from login/signup.
- `lib/authFailure.ts`: shared classification for network, rate-limit and service failures, plus a non-sensitive recovery response.
- `lib/workspace.ts`: separates service failure from missing identity, retains the requested route at login, and fails closed when profile/membership loading fails. Project selection still uses active server-side membership.
- `app/login/actions.ts`: optional audit failure no longer interrupts successful sign-in; active project membership influences the initial navigation destination.
- `app/auth/callback/route.ts`: keeps return destinations on failed confirmations and uses the stored profile as the existing user's navigation hint.
- `app/auth/signout/route.ts`: makes GET non-destructive, checks POST origin, clears the selected-project cookie and preserves SDK session cleanup.
- `app/admin/actions.ts`, `app/admin/login/page.tsx`: retain admin deep links and stop a denied admin login from revoking the music session. Admin permissions remain checked on the server.
- `app/api/session/status/route.ts`: returns verified identity/navigation hints without exposing tokens; transient errors return 503 rather than a false signed-out result.
- `components/SessionExperience.tsx`: initializes the existing cookie-based browser client on every surface, rechecks identity on visibility/connection recovery, refreshes server content on account changes, and clears member preferences after confirmed sign-out.

### Returning members and portal navigation

- `lib/returningUser.ts`, `components/PublicNavigation.tsx`, `components/PublicNavigationClient.tsx`: server-recognized navigation with client synchronization, useful member actions, accessible mobile menu state and public discovery retained.
- `app/home/page.tsx`, `app/fan/page.tsx`, `components/AppShell.tsx`: active creative membership is respected even when the profile began as a fan.
- `app/listen/page.tsx`: signed-in discovery supports the member's library without requiring a portal redirect.
- `components/FanShell.tsx`, `app/fan/profile/page.tsx`: creators retain a visible workspace action on their mobile listening/profile surface.
- `app/projects/actions.ts`: newly created project selection now persists like explicitly selected projects.

### Listening continuity and lightweight persistence

- `components/ListeningProvider.tsx`: one root-mounted public audio player survives client-side navigation and portal changes; another media player can take audio focus. Dismissal and logout stop the shared player.
- `components/TrackPlaylist.tsx`: restores allowed track IDs, queue order and position; offers Resume Listening without autoplay; saves progress at a bounded frequency; avoids duplicate playback commands and does not render the collapsed queue.
- `lib/listeningState.ts`: versioned, bounded, account-scoped state. Restored IDs must exist in the freshly supplied authorized catalogue. Only IDs, position and timestamps are stored, not private media URLs, audio, profiles or authentication tokens.
- `components/ListenerExperience.tsx`: uses the shared transport, restores practical discovery/library context, initially renders 20 songs, and recovers from failed library updates.
- `app/api/listening/route.ts`: supplies a fresh published catalogue through the existing `music_weekly_chart` view. That view filters published, released music. Media requests still use the existing authorization checks and fresh signed URLs.
- `app/layout.tsx`: mounts the session/listening providers once and enables viewport safe areas.

### Offline and mobile

- `public/sw.js`, `public/offline.html`: a dedicated offline screen replaces cached login fallbacks. No personalized HTML, API response, authentication page, signed media or generic image response is cached. Only this application's older shell caches are removed.
- `components/PwaRegister.tsx`: registration runs once, checks for updates and limits development cleanup to this application's worker/cache names; storage failures are harmless.
- `app/manifest.ts`: stable app identity and an identifiable startup URL; returning members retain public discovery and useful continuation actions.
- `app/error.tsx`: retryable page failure UI instead of a generic false logout.
- `app/responsive.css`, `app/fan-premium.css`, `app/admin/control-room.css`: repairs within existing styles for shrinking layouts, scrollable tables/drawers, safe areas, readable form inputs and tap targets. Floating listening/navigation controls hide while a mobile text field has focus; audio remains mounted.

### Regression coverage

- `tests/session-stability.test.mjs`: executable proxy, cookie, deep-link, revoked-session, logout, queue-validation and service-worker regressions.
- `tests/browser/session-repair.mjs`, `tests/helpers/mock-supabase.mjs`: real Next.js app, isolated HTTP auth/data fixture, synthetic accounts and range-capable synthetic audio.
- `tests/navigation.test.mjs`, `tests/release-comments.test.mjs`, `tests/music-artist-ecosystem.test.mjs`: existing assertions follow the shared audio architecture and membership-aware routing.
- `package.json`, `package-lock.json`: exact Playwright development dependency and repeatable typecheck/browser commands. Production dependencies are unchanged.

## C. Validation

Final local checks:

- `npm test`: 54 passed, 0 failed, 0 skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed using the production build configuration.
- `npm run test:browser`: 24 scenarios passed using Chromium with Android Chrome emulation and an isolated mock Supabase service.
- `git diff --check`: passed.

The browser scenarios cover registration instructions; token confirmation and deep links; authenticated refresh; returning-user navigation; actual SDK refresh-token exchange and cookie rotation against the fixture; persistent browser-profile reopening; queue/position restoration without autoplay; explicit resume; one audio element during artist/profile/portal navigation; connection loss/recovery; 320, 390, 768 and 1440px viewport overflow checks; mobile text focus; selected project persistence; creator, project, catalogue, upload, messages and profile rendering; Control Room rendering; actual service-worker offline navigation and exact-URL recovery; simulated auth outage; GET logout confirmation; explicit POST logout; password login to a protected deep link; and revoked-session rejection.

The checks use synthetic users and media. They do not send real email, exercise a real R2 object, upload production files or mutate production data. A representative mobile screenshot was visually inspected. Existing regression coverage for split workflows, uploads, media permissions, comments and fan library behavior also remains passing.

Early test runs exposed fixture issues (hostname mismatch, audio range handling and URL encoding expectations); these were corrected. The final results above refer to the completed passing runs, not those earlier attempts.

To reproduce:

```sh
npm ci
npx playwright install chromium
npm test
npm run typecheck
npm run build
npm run test:browser
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can point to a preinstalled compatible Chromium binary. The browser harness binds only local test ports and uses synthetic credentials. It starts Next.js with webpack for deterministic isolated browser checks; the separate production build uses the project's normal build toolchain.

## D. Remaining verification and limitations

- No authorized real test-account credentials were available. Real email delivery/confirmation, production sign-in, refresh/revocation policy and account-specific portal permissions still need acceptance testing.
- Physical Android Chrome, iPhone Safari, standalone/home-screen installation, OS-level PWA closure/reopening, on-screen keyboard geometry and background/lock-screen audio were not tested on devices. Chromium emulation and manifest-entry reopening are not substitutes for those checks.
- Public listening continues across client-side navigation. Private project review/ranking players remain tied to their authorized workspace and restore from fresh authorized track props; uninterrupted private preview audio across arbitrary routes is not implemented.
- Browser/OS autoplay restrictions are respected. Reopening offers Resume Listening. The app does not promise background audio when the operating system suspends it.
- This is connection recovery, not an offline-download feature. No private media or workspace is persisted for offline browsing.
- Previously buffered audio and already issued R2 URLs cannot be recalled instantly. Existing signed URLs expire after 15 minutes; authorization is rechecked when requesting a fresh media URL. R2 range seeking and URL expiry need a real-media acceptance test.
- The read-only Supabase advisors reported existing security and performance notices: callable security-definer functions, leaked-password protection disabled, missing indexes and policy-planning costs. These are follow-up findings, not established causes of session loss. Tables intentionally served through checked server routes also have RLS with no direct-client policies. No policy, function, database setting or production row was changed in this repair.

Advisor references: [security-definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [RLS query planning](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).

## E. Coordinated release

Branch: `fix/phase1-session-mobile-stability`.

All related changes are prepared as one consolidated commit and one branch publication for a draft pull request. The PR remains unmerged for live-account/device acceptance. No direct Vercel deployment, production database change, destructive data operation or unrelated commercial/financial change is part of this release. GitHub remains the deployment source.

The final handoff includes the commit/PR link and any verified GitHub deployment-check status. Passing local checks does not mean this repair is already live.
