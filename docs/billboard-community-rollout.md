# FACKTS Billboard and community

## Available flows

- `/billboard`: public weekly chart, listening queue, search and album/EP grouping.
- `/billboard/submit`: signed-in artist uploads a separate finished audio copy and optional original artwork. Credits and publication permission are required. Use the same collection name and artist account for each album/EP track.
- `/admin/releases`: administrators with music permission listen, review artwork/credits and approve or return submissions. Approved future dates become public at midnight Kenya time on that date. Releases can be withdrawn by the submitting artist or removed by music administrators.
- `/billboard/[id]`: shareable public release page, credits, weekly vote and artist message link.
- `/messages`: private inbox and public/project member directory. Conversation pages refresh every ten seconds in a visible tab, support older-message paging, read markers and blocking.
- Internal and public players: shuffle without repetition until the queue ends, repeat-one/all/off, playback speed, native seek/volume controls, and named playlists stored on this device (scoped to account/project for internal use).

## Rules and privacy

Private project assets are never automatically published. Release uploads use a separate R2 prefix. On submission the server copies uploaded objects to new keys which were never exposed in an upload URL, preventing a retained upload URL from replacing a reviewed file. Public media routes resolve only approved, due releases; owner/music-admin previews are checked server-side. Media URLs expire after 15 minutes. Previously issued media links can work until expiry after withdrawal.

Votes: verified active accounts only; one vote per account per song per Kenya-calendar week, Monday 00:00 reset; undo is allowed. Artists cannot vote for their own submissions. Multiple songs may be supported. Ties use newest release first, then ID. These are account-based community votes, not identity-verified audience measurements.

Messaging: verified active senders; recipients must be public creators, published artists, active shared-project members or someone who has already messaged the sender. Participant-filtered queries only; browser roles have no direct table access. Both sides of a block prevent sends. Atomic database limits allow ten messages per minute and 200 per rolling day. There are no attachments, group chats or push notifications in this release.

All new tables have RLS enabled, with service-only access. Mutations authenticate on the server and never take an actor ID from the browser. Database functions run as invoker and are not executable by anon/authenticated roles. Confirmed-email checks run through Supabase Auth on the server; database functions additionally verify active profiles. No changes to existing project allocations or private audio.

## Validation and launch

Run `npm test` and `npm run build`. Tests cover vote uniqueness/reset, future and private releases, media access boundaries, verified-account guards, message permissions/blocks/rate limits, player end/repeat/shuffle behavior, and prior split/download regression tests.

Live launch sequence: apply `20261010191541_public_releases_and_member_messages.sql`, verify RLS/grants and chart query, deploy, verify public Billboard and sign-in routes. No sample songs or private artist material are seeded. The owner should submit one real finished track and review it in Control Room to complete the authenticated upload/play/vote/message acceptance check. R2 uses the existing credentials and CORS configuration; server-side CopyObject requires the existing object-write permission.

Known scope: playlists stay on the current device; inbox updates use polling; submissions are one song at a time, up to ten per day, 150 MB audio and 10 MB artwork; first release means hosting here, not automatic delivery to external streaming services. Public chart has no archived-week browsing yet.
