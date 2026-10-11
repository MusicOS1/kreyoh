import {discoveryContent} from '../../lib/discoveryContent';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import ListenerExperience from '../../components/ListenerExperience';
import {chart} from '../../lib/community';
export const dynamic='force-dynamic';
export const metadata={title:'Discover music | FACKTS Music',description:'Listen to independent releases, discover artists and explore the FACKTS community.'};
export default async function Listen(){return <><PublicNavigation/><ListenerExperience releases={await chart()} editorial={await discoveryContent()}/><PublicFooter/></>;}
