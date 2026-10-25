import 'server-only';
import { createAdminClient } from './supabase/admin';
import { uuidPattern } from './community';

/** Use the existing published, already-released catalogue projection only. */
export async function publicHeroCovers(): Promise<string[]> {
  try {
    const { data, error } = await createAdminClient().from('music_weekly_chart')
      .select('id').eq('has_cover', true).order('release_at', { ascending: false }).limit(12);
    if (error) return [];
    const ids = [...new Set((data || []).map(row => row.id).filter((id): id is string => typeof id === 'string' && uuidPattern.test(id)))];
    return ids.map(id => `/api/releases/${id}/media?kind=cover`);
  } catch { return []; }
}
