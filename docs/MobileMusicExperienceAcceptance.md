# FACKTS Music — mobile-player and premium design acceptance

## Delivered as draft code
- Compact public player exposes an actual mute/unmute control and volume slider, including phone layout.
- Media Session registers title, artist, artwork and system play/pause, track navigation, seek commands where supported. Browsers/OS decide when to show lock-screen and headset controls. Cannot guarantee a permanent overlay on every phone.
- Existing installable PWA manifest and service worker are kept. Added same-origin push display and click handling; **no push subscriptions or server senders are enabled yet**.
- DM Sans interface with Syne display headings, original FACKTS light and dark modes, visible theme toggle. Light uses true white surfaces and black body text; image heroes retain readable contrast.
- Workspace global search across public artist profiles and the currently selected authorized project's tracks, beats and joined project names. Do not leak foreign private projects.
- Beat Library player with a single audio element and small playlist rows. Detailed claim/credit/upload and metadata forms remain behind expandable sections.
- KODA is a small, grounded music-guide interface using current Help topics. AI responses only on existing /help when configured; no invented generative capability.
- Public home features concise four-step guidance without deleting its real creator content.

## Not yet delivered / do not claim as live
- No Play Store APK/AAB package, developer-console release, listing, verified Android package name, app signing key or Digital Asset Links published.
- Notifications still require a secure opt-in Web Push subscription backend, VAPID keys, consent records, delivery triggers, withdrawal/unsubscribe handling and real-device/browser acceptance.
- Background audio depends on the mobile operating system and player/browser restrictions, must test real Android devices with screen locked and app minimized.
- App install from Chrome/standalone PWA is supported; a Google Play Trusted Web Activity would be a subsequent distributable with verified ownership, using Bubblewrap or PWABuilder.
- These changes are on an isolated GitHub feature branch, not production. Do not merge or apply database changes without owner review.

## Tests
1. Check player volume in desktop and mobile dock, mute toggles and slider update real playback volume.
2. Play a published song on Android; lock phone; check OS media card, song title/artwork, pause/resume, next/previous. Reopen app and test continuous queue.
3. Switch themes on homepage, fan, workspace and admin, reload and verify persisted setting, black legible text on all white pages.
4. Search known artist, beat and project; verify results restricted to existing selected project and public artist profile.
5. Open /beats and test one audio player, a queue row, next/previous, details, claims, editing and upload still work.
6. Check KODA opens, FAQ links work, no fake AI answers. Check mobile overlay doesn't obscure player.
7. Run standard tests, TypeScript and full build, then browser flows. Verify no production deploy.
