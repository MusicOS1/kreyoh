import { chart, currentChartWeek } from '../../lib/community';
import { discoveryContent } from '../../lib/discoveryContent';
import { publicMusicArtists } from '../../lib/musicArtists';
import { fanHeroSettings } from '../../lib/fanHero';
import { returningUser } from '../../lib/returningUser';
import { createAdminClient } from '../../lib/supabase/admin';
import EcosystemFrame from './EcosystemFrame';
import PublicFooter from '../PublicFooter';
import ListenerExperience from '../ListenerExperience';
export default async function PublicMusicPage() {
  const [identity, music, editorial, artists, heroes] =
    await Promise.allSettled([
      returningUser(),
      chart(),
      discoveryContent(),
      publicMusicArtists(),
      fanHeroSettings(),
    ]);
  const viewer = identity.status === 'fulfilled' ? identity.value : null;
  const [library, votes] = viewer
    ? await Promise.all([
        createAdminClient()
          .from('fan_music_library')
          .select('kind,item_id,label,track_ids,updated_at')
          .eq('user_id', viewer.id)
          .limit(1000),
        createAdminClient()
          .from('music_votes')
          .select('release_id')
          .eq('user_id', viewer.id)
          .eq('week_start', currentChartWeek()),
      ])
    : [{ data: [] }, { data: [] }];
  const incomplete = [music, editorial, artists, heroes].some(
    (result) => result.status === 'rejected',
  );
  return (
    <EcosystemFrame identity={viewer} active="listener">
      <ListenerExperience
        releases={music.status === 'fulfilled' ? music.value : []}
        editorial={editorial.status === 'fulfilled' ? editorial.value : []}
        artistsDirectory={artists.status === 'fulfilled' ? artists.value : []}
        heroSettings={heroes.status === 'fulfilled' ? heroes.value : undefined}
        userId={viewer?.id}
        name={viewer?.name}
        initialLibrary={library.data || []}
        votedIds={(votes.data || []).map((row) => row.release_id)}
        showFanNav={false}
        loadWarning={
          incomplete
            ? 'Some music information is temporarily unavailable. Please try again in a moment.'
            : undefined
        }
      />
      <PublicFooter />
    </EcosystemFrame>
  );
}
