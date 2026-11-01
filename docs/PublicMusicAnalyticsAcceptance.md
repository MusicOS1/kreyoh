# Public music analytics acceptance

Scope: every published, publicly playable release on /listen and /fan. Private project tracks, studio stems and beats are excluded.

Admin: white readable hero text; real current saves, comments and per-artist followers. Missing play or like records show unavailable rather than zero. No retroactive conversion of saves to likes. Date range filters only historical metrics where dates exist.

Fan: compact like, save, comment counts. Playing song shows waveform with comment markers after the additive timestamp migration. Existing normal comments remain intact. Artist cards display follower counts even without a released track. Inspired by familiar audio-platform interaction patterns; retain original FACKTS visual identity.

Migration status: qualified-play / like tracking and timed comments migrations are drafted, NOT applied to production. Review isolated RLS and real account behaviour before database rollout. Vercel preview readiness does not prove the database is ready. No production deploy until approval.

Acceptance: public catalogue complete; metadata and counts correct; multi-account engagement; repeat/seek fraud checks; stable persistent playback; comment timestamp add/seek; CSV current vs historical clarity; mobile responsive.
