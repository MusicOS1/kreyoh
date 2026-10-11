import {discoveryContent} from '../../lib/discoveryContent';
import {fanHeroSettings} from '../../lib/fanHero';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import ListenerExperience from '../../components/ListenerExperience';
import {chart} from '../../lib/community';
export const dynamic='force-dynamic';
export const metadata={title:'Discover music | FACKTS Music',description:'Listen to independent releases, discover artists and explore the FACKTS community.'};
export default async function Listen(){const [releases,editorial,heroSettings]=await Promise.all([chart(),discoveryContent(),fanHeroSettings()]);return <><PublicNavigation/><ListenerExperience releases={releases} editorial={editorial} heroSettings={heroSettings}/><PublicFooter/></>;}
