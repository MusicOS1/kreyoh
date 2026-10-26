# Shared public header

The Privacy screenshot showed the old public navigation colliding with the logo and wrapping labels. The homepage and other public pages were still selecting different implementations.

All callers of `PublicNavigation` now use the approved homepage header. The duplicate `HomepageNavigationClient` is removed. The shared header owns its Manrope/Sora font variables, so it renders consistently on About, Contact, Partners, Billboard, public creator pages and legal pages without changing their body typography.

Only header implementation files change: `PublicNavigation.tsx`, `PublicNavigationClient.tsx` and `PublicNavigation.module.css`, with the obsolete duplicate removed. The existing homepage prop remains accepted for compatibility, but no longer selects a separate header. Logo and navigation groups retain space; labels and account actions stay on one line; smaller screens use the existing approved mobile menu. Dropdown heading typography is explicitly contained within the header to avoid unrelated global heading rules.

No homepage hero, artwork, page-content, legal-content, global stylesheet, role portal, authentication, permission, database or playback implementation changes. Existing authentication policy for legal pages remains intact.

## Browser verification

The new `tests/browser/public-header.mjs` checks 140 route/viewport combinations, including anonymous and signed-in visitors. It verifies one public header, no overlapping controls, no clipped labels, containment within the viewport, dropdown/mobile-menu operation, and Escape focus restoration.

Widths: 375, 390, 768, 1024, 1201, 1280, 1366, 1440, 1756 and 1920px.

Anonymous routes: `/`, `/about`, `/contact`, `/partner`, `/creators`, `/billboard`.

Signed-in routes: `/`, `/about`, `/contact`, `/partner`, `/billboard`, `/privacy`, `/terms`, `/copyright`.

The existing homepage audit also checks its approved hero measurements and artwork behavior. GitHub CI runs both browser audits and uploads their screenshots. All test records are local synthetic fixtures; no production data is changed.

Screenshots of the corrected header on Privacy: [desktop](header-consistency/Desktop.webp), [mobile](header-consistency/Mobile.webp).

## Results

- 140 shared-header route/viewport checks passed in development and in the optimized production server.
- The 14 existing homepage browser scenario groups passed, including its approved-reference geometry, artwork animation, controls and reduced motion.
- All 36 existing session, playback and workspace browser scenarios passed.
- All 108 repository tests passed; standalone TypeScript and production build passed.
- The homepage source, hero stylesheet, artwork component, page content, legal source, root layout, global styles, role portals and auth/permission code remain untouched by this change.
