import {getWorkspace} from '../lib/workspace';
import EcosystemShell from './ecosystem/EcosystemShell';
import AppExperienceEnhancer from './AppExperienceEnhancer';
import TrackReplacementEnhancer from './TrackReplacementEnhancer';
import SupportTransparencyEnhancer from './SupportTransparencyEnhancer';
export default async function AppShell({children}:{children:React.ReactNode}){
 const {roles}=await getWorkspace();
 const canReplaceTracks=roles.some(role=>['Super Admin','Admin','Project Lead','A&R'].includes(role));
 return <><AppExperienceEnhancer/><TrackReplacementEnhancer enabled={canReplaceTracks}/><SupportTransparencyEnhancer roles={roles}/><EcosystemShell>{children}</EcosystemShell></>;
}
