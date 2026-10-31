import 'server-only';
import {communityAccount,uuidPattern} from './community';
import {hasAnyRole} from './workspace';
import {hasControlRoomPermission} from './controlRoom';
import {assertR2ObjectAccess,finalizeReleaseObject,freezeProductionReleaseObject} from './r2';
export const releaseSchemaPending=(error:any)=>['42703','42P01','PGRST202','PGRST204'].includes(error?.code);
export async function releaseAccess(id:string){
 if(!uuidPattern.test(id))throw Error('Release unavailable.');
 const workspace=await communityAccount();
 const {data:release,error}=await workspace.admin.from('music_releases').select('*').eq('id',id).maybeSingle();
 if(error||!release?.source_track_id)throw Error(releaseSchemaPending(error)?'Release workflow setup pending.':'Linked release unavailable.');
 const reviewer=await hasControlRoomPermission(workspace.user.id,'music');
 if(!reviewer&&!workspace.activeProjects.some((p:any)=>p.id===release.source_project_id))throw Error('Project access required.');
 return {...workspace,release,reviewer};
}
export async function releaseCommand(input:{id:string;action:string;revision:number;data:Record<string,unknown>;requestId:string}){
 if(!uuidPattern.test(input.id)||!uuidPattern.test(input.requestId)||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('Invalid release request.');
 const allowed=['create','save','submit','review','changes_requested','approve','reject','publish','withdraw','campaign'];
 if(!allowed.includes(input.action))throw Error('Unknown release action.');
 const workspace=input.action==='create'?await communityAccount():await releaseAccess(input.id);
 const {admin,user,project}=workspace;const release='release' in workspace?workspace.release as Record<string,any>:null;
 if(input.action==='create'){
  const {data,error}=await admin.from('tracks').select('id').eq('id',input.data.track_id).eq('project_id',project?.id).maybeSingle();
  if(error||!data)throw Error('Choose a track in the selected project.');
 }else if(['save','submit','campaign'].includes(input.action)&&project?.id!==release?.source_project_id)throw Error('Select this release’s project before editing it.');
 if(input.action==='submit'){
  if(!release)throw Error('Linked release unavailable.');
  if(release.revision!==input.revision||!['draft','changes_requested'].includes(release.workflow_state))throw Error('This release changed. Reload before submitting.');
  const roles=workspace.memberships.find((m:any)=>m.project_id===release.source_project_id)?.roles||[];
  if(user.id!==release.submitted_by&&user.id!==release.artist_id&&!hasAnyRole(roles,['Super Admin','Admin','Project Lead','A&R','Manager']))throw Error('Your role cannot submit this release.');
  const {data:requirements,error}=await admin.rpc('release_requirements',{p_release:input.id});
  if(error||!requirements?.complete)throw Error('Resolve the release requirements before submitting.');
  const assets=await admin.from('project_assets').select('id,project_id,bucket_id,storage_path,mime_type,storage_etag,byte_size').in('id',[release.source_master_id,release.source_cover_id]).eq('project_id',release.source_project_id);
  if(assets.error)throw Error('Source files unavailable.');
  const master=assets.data?.find((a:any)=>a.id===release.source_master_id),cover=assets.data?.find((a:any)=>a.id===release.source_cover_id);
  if(!master||!cover||master.bucket_id!=='r2'||cover.bucket_id!=='r2')throw Error('Approved R2 master and artwork required.');
  const [audioHead,coverHead]=await Promise.all([assertR2ObjectAccess(master.storage_path),assertR2ObjectAccess(cover.storage_path)]);
  if(!audioHead.ContentLength||audioHead.ContentType!==master.mime_type||!coverHead.ContentLength||coverHead.ContentLength>10*1024**2||coverHead.ContentType!==cover.mime_type)throw Error('Source media does not match its approved file record.');
  if(master.byte_size&&Number(master.byte_size)!==audioHead.ContentLength||master.storage_etag&&master.storage_etag!==audioHead.ETag)throw Error('The source master has changed since its approval.');
  const prefix=`releases/${release.artist_id}/${release.id}/v${release.revision}`;
  // Reviewed copies never receive client PUT capabilities. Retries reuse this revision's keys.
  await freezeProductionReleaseObject(master.storage_path,prefix+'/audio',audioHead.ContentLength,master.mime_type);await finalizeReleaseObject(cover.storage_path,prefix+'/cover');
 }
 const {data,error}=await admin.rpc('release_mutate',{p_actor:user.id,p_action:input.action,p_release:input.id,p_revision:input.revision,p_data:input.data,p_request:input.requestId});
 if(error)throw Error(releaseSchemaPending(error)?'Release workflow setup pending.':error.message);
 return data;
}
export function releaseState(release:any){return release.status==='published'&&new Date(release.release_at).getTime()<=Date.now()?'published':release.workflow_state||release.status;}
export function releaseTime(value:string){return new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(value))+' EAT';}
