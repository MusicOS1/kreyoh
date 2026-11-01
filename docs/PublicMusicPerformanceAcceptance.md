# FACKTS Public Music Performance — Acceptance

- Fan counts are lifetime qualified public plays only. They cannot be reconstructed from earlier private studio listens, beat plays, or track-file opens.
- Admin Control Room /admin/billboard-analytics reads date-scoped qualified public streams, actual session starts, unique listeners, every published song and credited artist grouped by artist_name (not solely uploader ID). CSV matches.
- /artist/insights displays only public releases explicitly linked to the authenticated artist or with matching credited name, and counts active follower records. No blanket ownership based on bulk uploader ID.
- Public artist discovery displays real cumulative plays per act and song; never count private project/version listens.
- A qualified play requires >=30 seconds or 50% for short tracks, plus anti-seek and repeat checks. The client retries transient session-start failures.
- Historical private listening records were preserved, not migrated into public plays.
- The connected database currently has zero public listening session starts and zero qualified plays at first review. DO NOT claim a working end-to-end fan stream until a real device plays 30+ seconds and admin reflects +1.
- All SQL reporting RPCs are service-only, stable/security-invoker. No public raw listener identifiers.
- Existing release attribution needs an admin review: all 10 public releases share one uploader/artist_id while displayed act names differ (Fackts music and Geng2930). Never silently reassign credit.
- Test public /listen and /fan; confirm session starts after play, qualifies after real listening threshold, displays public count, updates /admin/billboard-analytics and artist totals; verify repeat limits and exclusions. Test with two fan accounts and Android background player.
- Review preview before production merge.
