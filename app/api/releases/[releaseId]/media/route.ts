import {createAdminClient} from '../../../../../lib/supabase/admin';
import {createR2PresignedUrl} from '../../../../../lib/r2';
import {viewer,uuidPattern} from '../../../../../lib/community';
import {hasControlRoomPermission} from '../../../../../lib/controlRoom';
export async function GET(request:Request,{params}:{params:Promise<{releaseId:string}>}){
 const{releaseId}=await params;const headers={'Cache-Control':'private, no-store'};
 if(!uuidPattern.test(releaseId))return new Response('Not found',{status:404,headers});
 const{data:release,error}=await createAdminClient().from('music_releases').select('*').eq('id',releaseId).maybeSingle();
 if(error)return new Response('Media unavailable',{status:503,headers});
 if(!release)return new Response('Not found',{status:404,headers});
 let linkedPublic=true;
 if(release.source_track_id){const result=await createAdminClient().rpc('release_public_eligible',{p_release:releaseId});linkedPublic=!result.error&&result.data===true;}
 if(!linkedPublic||release.status!=='published'||new Date(release.release_at).getTime()>Date.now()){
 const user=await viewer();if(!user)return new Response('Not found',{status:404,headers});
 const reviewer=await hasControlRoomPermission(user.id,'music');
 let owner=user.id===release.artist_id||user.id===release.submitted_by;
 if(owner&&release.source_track_id){const member=await createAdminClient().from('project_members').select('id').eq('project_id',release.source_project_id).eq('user_id',user.id).eq('status','active').maybeSingle();owner=!member.error&&Boolean(member.data);}
 if(!owner&&!reviewer)return new Response('Not found',{status:404,headers});
 }
 const key=new URL(request.url).searchParams.get('kind')==='cover'?release.cover_key:release.audio_key;
 if(!key||!key.startsWith(`releases/${release.artist_id}/${releaseId}/`))return new Response('Not found',{status:404,headers});
 try{return new Response(null,{status:307,headers:{...headers,Location:await createR2PresignedUrl('GET',key,900)}});}catch{return new Response('Media temporarily unavailable',{status:503,headers});}
}
