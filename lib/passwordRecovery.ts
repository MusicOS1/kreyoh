/**
 * Password recovery emails must always return to the published FACKTS Music
 * hostname, regardless of local/preview environment or missing site variables.
 * This exact URL must be present in Supabase Auth > URL Configuration.
 */
export const FACKTS_MUSIC_URL = "https://music.facktsafrica.co.ke";
export const PASSWORD_RECOVERY_REDIRECT =
  FACKTS_MUSIC_URL + "/auth/recovery";

export const isRecoveryCallback = (url: URL) =>
  url.searchParams.get("flow") === "recovery" ||
  (url.searchParams.get("type") === "recovery" &&
    url.searchParams.has("token_hash"));
