FACKTS MUSIC V3.1 — IN-APP MEDIA + WORKSPACE MENU

Apply AFTER the FACKTS Music Culture Platform V3 patch.
Extract into the FACKTS Music project root and replace matching files.

Adds:
- Global in-app video player across public pages AND authenticated workspace
- YouTube, YouTube Shorts, Vimeo, Loom, MP4/WebM/Ogg/MOV support
- Existing video links now open in a premium modal instead of immediately leaving FACKTS Music
- Escape/backdrop/close-button dismissal
- Optional original-source link remains inside the player
- Desktop workspace menu can collapse/expand from the top bar, CRM-style
- Menu preference persists in the browser
- Mobile drawer behavior is left intact

Files:
app/layout.tsx
app/afroplug-v3.css
components/GlobalVideoPlayer.tsx
components/WorkspaceChromeEnhancer.tsx

Test:
npm run dev

Then verify:
1. Homepage WATCH THE PEOPLE video opens inside FACKTS Music.
2. A YouTube/Vimeo link inside any workspace screen opens in the same player.
3. Workspace top bar shows Hide menu / Show menu on desktop.
4. Mobile menu still works normally.
5. npm run build passes before pushing.
