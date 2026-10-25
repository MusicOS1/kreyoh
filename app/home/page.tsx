import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getExperienceIdentity} from '../../lib/experienceIdentity';
import {preferredWorkspace} from '../../lib/workspaceExperience';
import WorkspaceDashboard from '../../components/ecosystem/WorkspaceDashboard';
export default async function PlatformHomePage(){
 const [identity,cookieStore]=await Promise.all([getExperienceIdentity(),cookies()]);
 const preference=cookieStore.get('fm_workspace')?.value;
 const selected=preferredWorkspace(identity.workspaces,preference?.startsWith(`${identity.id}:`)?preference.slice(identity.id.length+1):null);
 if(selected.kind==='listener')redirect('/fan');
 return <WorkspaceDashboard kind={selected.kind}/>;
}
