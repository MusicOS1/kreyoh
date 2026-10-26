# Homepage recovery and visual regression verification

Superseded: this earlier correction restored the wrong hero. The approved moving-artwork design is restored in [ApprovedHomepageRestoration.md](ApprovedHomepageRestoration.md).

Branch: `feat/session2-professional-onboarding`. Existing draft PR: #19. Before baseline: `ed2d439e7d72b977ffff7f111fa63aed1c5ba0ab`.

## Findings from the actual branch and browser

The initial checkout was on PR #18's branch. The audit switched to PR #19's remote head before reading, running or changing the homepage. This matters because earlier versions used a different header and hero.

The homepage combined `public-nav-*` and `fm-public-nav-*` classes. Those activated the old header in `kreyoh-ui.css`, overrides in `afroplug-v3.css`, additional positioning in `responsive.css`, and another 312-line override file, `homepage-stability.css`. The competing layouts used 820px, 860px, 940px, 1180px and 1690px breakpoints. Header positioning varied between absolute, relative and sticky; container padding, maximum widths and link gaps were repeatedly overridden. Desktop destinations were hidden with `nth-child(n+5)`, so account state could change which destinations disappeared.

Production validation also reproduced a stylesheet-order difference in the page wrapper: the shared `.public-site` blue background won in development, while `.fm-v3-site` transparency won in production. The homepage now owns its wrapper and original dark FACKTS background in its module, with the same public color tokens and inherited link behavior. Neither legacy wrapper class is attached to this page.

The hero similarly activated both the original global grid and the stability grid. Its original minimum image column was 520px; headline sizes had a 116px ceiling and an 86px mobile ceiling before later overrides. Global `h1` rules in both `polish.css` and `kreyoh-ui.css` force `font-weight:700!important` and `letter-spacing:-.02em!important`, defeating local headline weight and tracking. These global rules remain unchanged because other routes depend on them.

The pre-edit browser at PR #19's latest commit did **not** reproduce desktop overlap at the seven sampled anonymous widths. It did reproduce the mobile headline defect: at 375px and 390px the 38px headline occupied four lines (161px high), splitting “Find your people.” The report does not attribute an older screenshot to a newer commit or claim a desktop collision was reproduced where it was not. No new broken-screenshot attachment was available with this request; the before evidence is a real capture of the exact branch baseline.

## Correction and isolation

- `app/page.tsx`: opts into the homepage header and scoped hero classes; preserves the headline, copy, photos, video, all following sections, creator query and footer.
- `components/PublicNavigation.tsx`: adds an optional `homepage` prop, defaulting to false. All existing callers retain the unchanged `PublicNavigationClient` implementation. Session lookup stays the same.
- `components/HomepageNavigationClient.tsx` and `HomepageNavigation.module.css`: one explicit hierarchy: Explore Music, Creators, About; account actions; More for How It Works, Partners, Contact and Library/workspace/account destinations. Below 1200px primary links move into the same menu; below 600px account actions are also in the menu. No positional hiding. The logo cannot shrink into the links. Menu supports click/tap, normal Tab order, Enter, ArrowDown, Escape with focus restoration, outside click, blur, route and resize dismissal. It is navigation, not an ARIA application menu.
- `app/HomepageHero.module.css`: owns the hero's grid, original photographic collage, original outlined headline, actions and responsive proportions. Three phrase spans prevent internal word wrapping. The spans own headline weight/tracking, avoiding the inherited global heading declarations without adding `!important`. Desktop text is capped at 60px; mobile scales to fit the real column. Grid children can shrink; the two columns stack below 901px.
- `app/homepage-stability.css`: deleted completely. The new header and hero no longer carry the legacy classes that triggered the conflicting global rules. Dormant global rules were left in place to avoid changing other routes or old public-page callers.
- No root layout, shared global stylesheet, shared default header, footer, legal page, portal, onboarding, authorization, database, playback or collaboration implementation was edited. No migration or production data operation was run.

The source-isolation tests retain checks for copy, photography, legal links and the shared default header. Tests tied to exact CSS strings were replaced with rendered geometry and interaction checks.

## Browser evidence

Screenshots use original FACKTS photography and branding; profile records are explicitly local synthetic fixtures. No real-account or production data was modified. Before captures use the baseline branch with `next dev`; after captures use the optimized production build with `next start`. Images below are lossless WebP encodings of browser screenshots, with no compositing or visual alteration. Desktop/tablet/mobile before images are cropped to the same 1000px viewport height for comparison; complete page captures are also produced by the audit script.

| Viewport | Before | After |
| --- | --- | --- |
| 1440px desktop | [Before](homepage-recovery/BeforeDesktop.webp) | [After](homepage-recovery/AfterDesktop.webp) |
| 768px tablet | [Before](homepage-recovery/BeforeTablet.webp) | [After](homepage-recovery/AfterTablet.webp) |
| 375px mobile | [Before](homepage-recovery/BeforeMobile.webp) | [After](homepage-recovery/AfterMobile.webp) |

All seven widths, 375, 390, 768, 1024, 1366, 1440 and 1920px, are checked for document overflow, intersecting header controls, controls outside the viewport, headline ranges exceeding their columns, loaded photography, menu destinations, keyboard behavior and footer legal links. The mobile touchscreen test follows Creators; the hash link follows How It Works and closes the menu. Signed-in visitors retain `/` and their workspace/library actions.

Desktop 100% uses the browser's default device scale of 1. 125% is **emulated** at physical widths 1366/1440/1920 using the corresponding CSS viewport and device scale 1.25. This is a responsive browser rendering check, not a claim that native Chrome UI zoom was manipulated. Native browser zoom remains an owner/device acceptance check; the available headless runtime does not expose it.

Representative routes: `/`, `/listen`, `/creators`, `/about`, `/admin/users`, `/privacy`, `/terms`, `/copyright`. Anonymous admin access retains its login redirect. Signed-in local fixture grants exercise the admin and legal pages without bypassing their normal application routing.

Before/after development screenshot comparison on untouched routes kept the same dimensions: About and the admin/legal login screens had 0.000% changed pixels; Creators 0.005%; Listen 0.040% (tolerance 8/255 per color channel). These are visual smoke comparisons, not evidence of live data/service correctness.

## Existing issue outside this correction

`lib/supabase/proxy.ts` omits `/privacy`, `/terms` and `/copyright` from `PUBLIC_ROUTES`. Anonymous visits redirected to login both before and after. Their links remain in the homepage footer and signed-in rendering is checked. Correcting that public-access policy requires a separately scoped routing change; authentication and legal routes were explicitly protected in this request.

## Reproduce in VS Code

From the existing repository terminal (stop the old dev server with Ctrl+C):

```bash
git fetch origin
git switch feat/session2-professional-onboarding
git pull --ff-only origin feat/session2-professional-onboarding
npm ci
npm run dev
```

Open http://localhost:3000. Existing local environment configuration is required for the real connected application. No new script or database migration is required for the homepage.

For local fixture regression (no production services):

```bash
npm test
npm run typecheck
npx playwright install chromium
node tests/browser/homepage-audit.mjs
npm run test:browser
node tests/browser/interaction-cards.mjs
npm run build
```

Run builds and browser dev-server suites sequentially. The audit also supports `AUDIT_PRODUCTION=1` against an existing fixture-configured production build. Browser screenshots and dimensions are written to `/tmp/homepage-recovery/verified` by default. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed Chromium binary.

The existing GitHub workflow now also runs on pushes to this feature branch (so an existing PR merge conflict cannot suppress checks), includes PRs targeting `feat/phase2-unified-workspaces` (PR #19's base), runs the actual homepage browser audit after the existing tests/TypeScript/build, and uploads its screenshots. No production deployment action was added.

## Local validation results

- Repository unit/regression suite: **108/108 passed**.
- Standalone TypeScript: **passed**.
- Optimized production build: **passed**, including TypeScript and page generation.
- Existing full browser regression suite: **36/36 passed**, including session refresh/relaunch, login deep links, role switching, player continuity, follow/like/comment isolation and portal rendering. This full suite preceded the final homepage-wrapper background ownership change; the final wrapper was verified by the complete focused audit in both development and production.
- Existing compact-card/interaction browser suite: **4/4 passed**.
- Final rendered homepage audit: **12 scenario groups passed** in development and production (seven widths, signed-in/hash/admin/legal flows, touchscreen flow, three emulated 125% desktop cases).
- `git diff --check`: **passed**.

Local services were fixture-backed throughout. These results do not claim real two-account professional-approval acceptance or native-device zoom acceptance. GitHub/Vercel results for the consolidated commit are linked in PR #19 after publication; this checked-in report records local verification.
