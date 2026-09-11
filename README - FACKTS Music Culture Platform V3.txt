FACKTS MUSIC — CULTURE PLATFORM V3

WHAT THIS PATCH DOES
- Rebuilds the public homepage into a culture-first, creator-led FACKTS Music experience.
- Adds a live public creator network page at /creators.
- Restyles the existing internal workspace into a cleaner premium studio-console system without changing its data/functions.
- Rebuilds /embed/creators as a true standalone public surface (no AppShell/login UI).
- Uses the real public creator database directly inside FACKTS Music.
- Uses existing FACKTS Music images/video assets already in the repo.
- Adds CSS-only motion, live creator ticker, image motion, ambient grid and glow effects.
- Keeps existing About, Partner, Contact, Login, Signup, project and workspace routes intact; the new global design layer applies across them.

FILES INCLUDED
app/layout.tsx
app/page.tsx
app/afroplug-v3.css
app/creators/page.tsx
app/embed/creators/page.tsx
components/PublicNavigation.tsx
components/PublicFooter.tsx

INSTALL
1. Extract this ZIP directly into the FACKTS Music project root.
2. Choose Replace/Merge when Windows asks.
3. Run: npm run dev
4. Check /, /creators, /embed/creators, /login and one internal workspace page.
5. Then run: npm run build

PUSH
 git add .
 git commit -m "Redesign FACKTS Music culture platform"
 git push

VIDEO LINKS
You can send YouTube/Vimeo links later. Public creator interviews already appear automatically when a public creator profile contains an interview URL. A dedicated video/conversation layer can be added without redesigning the site again.
