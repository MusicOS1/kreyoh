# Approved homepage restoration

The owner identified the approved homepage by screenshot and the existing Phase 2 preview:
https://kreyoh-git-feat-phase2-uni-736ec9-fackts-africa-groups-projects.vercel.app/#how-it-works

The previous correction restored the wrong, earlier photographic hero. This update brings back the approved moving artwork homepage from `4ca4fa8f30817a7cd5c4017e0d0785ec8b2b361b` on the existing Session 2 branch and PR #19.

## Restored from the approved source

- The five-lane moving artwork wall, including the owner's twelve original supplied artworks. Portrait images retain their original proportions.
- Centred “Discover music. Find your people. Be part of it.” headline, gold middle line, original hero spacing and calls to action.
- The original Manrope/Sora font files and licenses.
- The six-link public navigation and full-sized Explore Music mega-menu, including its community feature panel, plus the approved responsive mobile menu.
- The homepage sections and messaging from the same Phase 2 source.

`HeroCoverWall.tsx`, its CSS module, `PublicNavigation.module.css`, `lib/heroCovers.ts`, the artwork files and font files are restored directly from that commit. `HomepageNavigationClient.tsx` uses the approved component with only its export name and a test marker changed.

The approved design-system rules are scoped in `app/ApprovedHomepage.module.css` and fonts are attached to this homepage. Two scoped priority declarations compensate for the older global heading weight/tracking reset without changing it for other routes. The earlier replacement's `HomepageHero.module.css` and `HomepageNavigation.module.css` are removed.

The shared public navigation still defaults to the unchanged Session 2 header on other pages. Existing legal footer links remain. No portal, onboarding, approval, authentication, playback, global stylesheet, database or production implementation is changed.

## Actual reference comparison

The approved commit was rendered in an isolated detached checkout with the same browser fixtures. Its measured hero, headline and logo dimensions match this restoration exactly at 390px and 1440px. These reference measurements are now fixtures in `tests/fixtures/approved-homepage-layout.json`; the browser audit checks them to prevent another restoration of the wrong hero.

The audit checks all seven requested widths, keyboard and touch navigation, artwork availability, actual animation transforms, pause/resume, reduced motion, signed-in homepage access, existing route behavior and emulated 125% desktop scaling. Native browser UI zoom is not claimed.

Screenshots: [Restored desktop](approved-homepage/Desktop.webp), [restored mobile](approved-homepage/Mobile.webp), [restored mega-menu](approved-homepage/MegaMenu.webp).

The preview remains protected by Vercel sign-in. Browser evidence is generated from a local build with synthetic profile fixtures and the original supplied artwork; it does not expose authenticated production data.

## Verification results

- 108 repository tests passed; standalone TypeScript and optimized production build passed.
- All 36 existing session/playback/workspace browser scenarios passed.
- The complete homepage audit passed in production: seven widths, artwork motion and reduced-motion controls, signed-in desktop fit at 1201/1280/1366/1440/1920px, signed-in/hash/admin/legal routes, touch navigation, and three emulated 125% desktop cases.
- Desktop and mobile hero dimensions match the independently rendered approved commit at 1440px and 390px.
- Existing anonymous legal-route redirects are unchanged; this restoration does not change authentication or the legal pages.
