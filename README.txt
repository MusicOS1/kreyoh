FACKTS MUSIC — LIVE CREATOR EMBED

Adds:
  app/embed/creators/page.tsx

Purpose:
  Provides a public, server-rendered creator-card surface at:
  https://music.facktsafrica.co.ke/embed/creators

The page queries FACKTS Music directly, only includes active + public profiles,
and selects the three strongest complete profiles. No cross-origin API fetch is needed.

Test locally:
  npm run build

Then push FACKTS Music and confirm:
  https://music.facktsafrica.co.ke/embed/creators
