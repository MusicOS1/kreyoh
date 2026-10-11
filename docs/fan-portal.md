# Fan portal

Public discovery is at /listen. It uses only approved, due releases from music_weekly_chart, supports public playback, and asks visitors to sign in for saving, following and voting. The public homepage links to discovery. The public Billboard contains no upload/submission CTA.

Fan-only profiles land at /fan through the default /home login destination. Mixed creator profiles retain their creator workspace. This classification affects navigation only; it grants no permissions. Explicit sign-in destinations are preserved.

/fan offers fresh releases, current Billboard, favourites, following, recently played, and named playlists with ordering. Personal library state is saved per account, including playlists, so it is available after refresh or on another device. The player remains mounted across the portal's category tabs. Leaving the portal navigates away and ends playback. There are no push release notifications yet; Following shows the current releases of followed artists.

The fan_music_library table is service-only with RLS enabled and no browser grants. Every server mutation derives the user from verified Auth and checks the active account. Song references are checked against the public release view. Reads and deletes are scoped to that user. No private project audio is queried by discovery or the fan portal.

Creator workspace navigation has My releases (/billboard/submit), which remains authenticated. This change does not publish any songs. The current catalogue may be empty until an artist submits and an administrator approves a release.

Validation: production build and 19 tests pass. Live grants checked: anon/authenticated denied; service_role allowed. End-to-end save, follow, playlist, and listening checks still require a signed-in fan and a real approved release.
