import {createAdminClient} from '../../../../../lib/supabase/admin';
import {createR2PresignedUrl} from '../../../../../lib/r2';
import {viewer,uuidPattern} from '../../../../../lib/community';
import {hasControlRoomPermission} from '../../../../../lib/controlRoom';
export async function GET(request:Request,{params}:{params:Promise<{releaseId:string}>}){
 const{releaseId}=await params;const headers={'Cache-Control':'private, no-store'};
 if(!uuidPattern.test(releaseId))return new Response('Not found',{status:404,headers});
 const{data:release,error}=await createAdminClient().from('music_releases').select('artist_id,status,release_at,audio_key,cover_key').eq('id',releaseId).maybeSingle();
 if(error)return new Response('Media unavailable',{status:503,headers});
 if(!release)return new Response('Not found',{status:404,headers});
 if(release.status!=='published'||new Date(release.release_at).getTime()>Date.now()){
 const user=await viewer();if(!user||(user.id!==release.artist_id&&!await hasControlRoomPermission(user.id,'music')))return new Response('Not found',{status:404,headers});
 }
 const key=new URL(request.url).searchParams.get('kind')==='cover'?release.cover_key:release.audio_key;
 if(!key||!key.startsWith(`releases/${release.artist_id}/${releaseId}/`))return new Response('Not found',{status:404,headers});
 try{return new Response(null,{status:307,headers:{...headers,Location:await createR2PresignedUrl('GET',key,900)}});}catch{return new Response('Media temporarily unavailable',{status:503,headers});}
}
