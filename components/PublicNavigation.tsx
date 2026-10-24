import GlobalHeader from './ecosystem/GlobalHeader';
import {returningUser} from '../lib/returningUser';
export default async function PublicNavigation(){return <GlobalHeader identity={await returningUser()}/>;}
