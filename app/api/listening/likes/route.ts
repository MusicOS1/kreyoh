import {NextRequest} from 'next/server';
import {createClient} from '../../../../lib/supabase/server';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {uuidPattern} from '../../../../lib/community';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const response=(value:object,status=200)=>Response.json(value,{status,headers});

export async function GET(){
 try{
  const client=await createClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return response({ok:true,likedIds:[]});
  const {data,error}=await createAdminClient().from('music_release_likes').select('release_id').eq('user_id',user.id).limit(5000);
  if(error)return response({ok:false,error:'Likes are temporarily unavailable.'},503);
  return response({ok:true,likedIds:(data||[]).map(x=>x.release_id)});
 }catch{return response({ok:false,error:'Likes are temporarily unavailable.'},503);}
}
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))return response({ok:false,error:'Invalid origin.'},403);
 if(Number(request.headers.get('content-length')||0)>1024)return response({ok:false,error:'Invalid request.'},413);
 let body:{releaseId?:unknown;liked?:unknown};
 try{body=await request.json();}catch{return response({ok:false,error:'Invalid request.'},400);}
 if(typeof body.releaseId!=='string'||!uuidPattern.test(body.releaseId)||typeof body.liked!=='boolean')return response({ok:false,error:'Invalid like request.'},400);
 try{
  const client=await createClient(),{data:{user}}=await client.auth.getUser();
  if(!user||!user.email_confirmed_at)return response({ok:false,error:'Sign in to like a song.'},401);
  const admin=createAdminClient();
  const {data:profile,error:profileError}=await admin.from('profiles').select('account_status').eq('id',user.id).maybeSingle();
  if(profileError||profile?.account_status!=='active')return response({ok:false,error:'An active account is required.'},403);
  const {data:release,error:releaseError}=await admin.from('music_weekly_chart').select('id,artist_id,featured_artist_ids').eq('id',body.releaseId).maybeSingle();
  if(releaseError)return response({ok:false,error:'This song is temporarily unavailable.'},503);
  if(!release)return response({ok:false,error:'Song not available.'},404);
  if(user.id===release.artist_id||(release.featured_artist_ids||[]).includes(user.id))return response({ok:false,error:'Artists cannot like their own release for ranking.'},403);
  const {error}=body.liked
   ?await admin.from('music_release_likes').upsert({release_id:body.releaseId,user_id:user.id},{onConflict:'release_id,user_id',ignoreDuplicates:true})
   :await admin.from('music_release_likes').delete().eq('release_id',body.releaseId).eq('user_id',user.id);
  if(error)return response({ok:false,error:'Could not save your like.'},503);
  return response({ok:true,liked:body.liked});
 }catch{return response({ok:false,error:'Could not save your like.'},503);}
}
