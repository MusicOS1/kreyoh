# FACKTS Music premium design system

The references inform hierarchy, confident scale, generous spacing and quiet product surfaces. The implementation uses the FACKTS mark, existing community photography, charcoal and warm gold, original menu groupings and independent type choices. It does not reproduce the reference branding, exact fonts, blue/yellow palette, artwork grid or product catalogue.

## Typography

Both variable families are self-hosted through the installed `next/font/local`; visitors do not contact a third-party font service. Manrope covers reading and controls; Sora covers editorial titles. Their SIL Open Font Licenses are included next to the font files in `public/fonts`. Sources are the Google Fonts repository directories `ofl/manrope` and `ofl/sora`. No runtime font package or new production dependency is required.

| Use | Family | Treatment |
| --- | --- | --- |
| Public hero | Sora | Responsive 38–82px, 720 weight; warm-gold emphasis at 550; tight tracking with 1.02 line height |
| Section titles | Sora | Responsive 32–64px, 650 weight; balanced wrapping and clear separation from body text |
| Navigation | Manrope | 13px, 650 weight; sentence case, 44px touch area and restrained active underline |
| Menu titles | Manrope | 14px, 700 weight; supporting text 12px with generous line height |
| Body copy | Manrope | Public copy 15–18px, comfortable line lengths and 1.8 line height |
| Primary buttons | Manrope | 12–13px, 700–750 weight; sentence case, 44–50px targets |
| Metadata and badges | Manrope | 10–11px, small purposeful tracking; quieter than titles |
| Compact song cards | Sora / Manrope | Clear 14px song title and readable supporting text without enlarging artwork |
| Account identity | Sora | 21–23px, 600 weight; supporting identity text in Manrope |

Legacy global rules that forced every heading to 700 weight and identical tracking no longer override component typography. Listening, professional workspace, legacy fan and persistent player surfaces all use the shared body family. Official logo artwork remains unchanged.

## Navigation and menus

The public header keeps About, How It Works, Creators, Explore Music, Partners, Contact and relevant account actions. The Explore Music link remains a direct destination. Its adjacent disclosure opens the music menu: discovery, artists and Billboard; personal library, workspace and conversation links; and a photographic FACKTS community feature. Protected links continue through the existing authentication and permission system.

The desktop menu uses grouped content, consistent outlined icons, short descriptions, careful padding and a single restrained shadow. On smaller screens a dedicated mobile panel provides the public destinations, music/workspace shortcuts and account actions without duplicating headers. Closed panels are unmounted, keeping hidden links out of keyboard navigation. Escape, outside click, route changes and resizing close the disclosure. Keyboard users can enter it with Arrow Down or Tab from its open trigger. Escape returns focus to the trigger.

The existing authenticated account/workspace selector uses the same dark surface, a stronger identity header, grouped personal actions, icon-led workspace cards and a clear Current indicator. Server-derived workspace options and the existing switch action remain authoritative. Listening navigation has explicit active states for Discover, Artists, Billboard and Library.

## Visual rhythm and interaction

Public sections retain the original content and media. Typography, section spacing, CTA grouping, cards, borders and warm-gold emphasis are refined around it. Primary actions use a consistent soft rectangle; secondary actions use quiet outlined or text treatment. Hover feedback uses small colour changes and at most a few pixels of movement. Menu reveals use opacity and short translation. The shared reduced-motion rule disables decorative animation, transitions and smooth scrolling. Existing light/afterhours listener theme variables remain available.

No account creation, membership, approval, data, upload or playback ownership logic is changed by this visual pass. The Phase 1 session and audio provider remain in the root layout. Existing quick actions still use their isolated background transport.


## Verification

The extended full browser suite passed 36 scenarios against the running Next app with isolated auth/data/media fixtures, including public and signed-in homepage access, playback continuity, deep links, session recovery, upload and signed retrieval, all nine professional workspaces, account switching and revoked access. Six focused checks passed: public navigation and responsive widths, music-menu keyboard/dismissal/routing/reduced-motion behaviour, loaded self-hosted typography, readable authenticated account panel, vote failure rollback, comment draft retention and compact card layouts. Mobile/desktop homepage, music-menu and account-menu screenshots were visually reviewed. These are local fixture checks; physical devices, live email, real accounts and R2 acceptance remain manual.

All 74 existing unit/regression tests passed. Standalone TypeScript checking, the production build and `git diff --check` also passed. No production data was used or modified.
