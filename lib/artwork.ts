import { createR2PresignedUrl, isR2Configured } from "./r2";
import { createAdminClient } from "./supabase/admin";

const SUPABASE_PREFIX = "supabase:";

export async function resolveArtworkUrl(storageKey?: string | null, fallback?: string | null) {
  if (!storageKey) return fallback || null;

  if (storageKey.startsWith(SUPABASE_PREFIX)) {
    const [, bucket, ...pathParts] = storageKey.split(":");
    const path = pathParts.join(":");
    if (!bucket || !path) return fallback || null;
    const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  if (isR2Configured()) return createR2PresignedUrl("GET", storageKey, 3600);
  return fallback || null;
}
