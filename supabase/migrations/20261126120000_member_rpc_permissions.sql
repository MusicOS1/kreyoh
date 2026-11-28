-- The application calls these project and presence mutations as signed-in members.
-- Retain the membership checks inside each procedure and the backend service grant.
revoke execute on function
 public.claim_beat(uuid,text), public.release_beat_claim(uuid),
 public.record_track_listen(uuid,integer), public.record_track_version_listen(uuid,integer),
 public.set_track_ranking(uuid,integer), public.set_track_version_ranking(uuid,integer),
 public.touch_my_presence(text,uuid)
 from public, anon;

grant execute on function
 public.claim_beat(uuid,text), public.release_beat_claim(uuid),
 public.record_track_listen(uuid,integer), public.record_track_version_listen(uuid,integer),
 public.set_track_ranking(uuid,integer), public.set_track_version_ranking(uuid,integer),
 public.touch_my_presence(text,uuid)
 to authenticated, service_role;
