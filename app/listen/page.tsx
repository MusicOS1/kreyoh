import {discoveryContent} from '../../lib/discoveryContent';
import {publicMusicArtists} from '../../lib/musicArtists';
import {fanHeroSettings} from '../../lib/fanHero';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import ListenerExperience from '../../components/ListenerExperience';
import {chart} from '../../lib/community';
import {returningUser} from '../../lib/returningUser';
import {createAdminClient} from '../../lib/supabase/admin';
export const dynamic='force-dynamic';
export const metadata={title:'Discover music | FACKTS Music',description:'Listen to independent releases, discover artists and explore the FACKTS community.'};
export default async function Listen(){const identity=await returningUser();const library=identity?await createAdminClient().from("fan_music_library").select("kind,item_id,label,track_ids,updated_at").eq("user_id",identity.id).limit(1000):{data:[]};const [releases,editorial,heroSettings,artistsDirectory]=await Promise.all([chart(),discoveryContent(),fanHeroSettings(),publicMusicArtists().catch(()=>[])]);return <><PublicNavigation/><ListenerExperience userId={identity?.id} initialLibrary={library.data||[]} showFanNav={false} releases={releases} editorial={editorial} heroSettings={heroSettings} artistsDirectory={artistsDirectory}/><PublicFooter/></>;}
