import {discoveryContent} from '../../lib/discoveryContent';
import {publicMusicArtists} from '../../lib/musicArtists';
import {fanHeroSettings} from '../../lib/fanHero';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import ListenerExperience from '../../components/ListenerExperience';
import {chart} from '../../lib/community';
export const dynamic='force-dynamic';
export const metadata={title:'Discover music | FACKTS Music',description:'Listen to independent releases, discover artists and explore the FACKTS community.'};
export default async function Listen(){const [releases,editorial,heroSettings,artistsDirectory]=await Promise.all([chart(),discoveryContent(),fanHeroSettings(),publicMusicArtists()]);return <><PublicNavigation/><ListenerExperience releases={releases} editorial={editorial} heroSettings={heroSettings} artistsDirectory={artistsDirectory}/><PublicFooter/></>;}
