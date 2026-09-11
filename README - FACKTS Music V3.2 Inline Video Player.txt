FACKTS MUSIC V3.2 — INLINE VIDEO PLAYER FIX

This patch changes only the video viewing behaviour from V3.1.

WHAT CHANGES
- Videos no longer open as a full-screen takeover/modal.
- The player opens directly inside the current FACKTS Music page/workspace.
- The surrounding page, navigation and workspace remain visible.
- YouTube, Shorts, Vimeo, Loom and direct video files remain supported.
- ESC or the X button closes the inline player.
- The CRM-style workspace menu toggle from V3.1 remains untouched.

REPLACE
- components/GlobalVideoPlayer.tsx
- app/afroplug-v3.css

TEST
npm run dev

Then click any Watch/video link.
