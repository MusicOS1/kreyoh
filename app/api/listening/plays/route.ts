import {createHash,randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '../../../../lib/supabase/server';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {uuidPattern} from '../../../../lib/community';

export const dynamic='force-dynamic';
const COOKIE='fm_listener';
const headers={'Cache-Control':'no-store'};
const bad=(error:string,status=400)=>NextResponse.json({ok:false,error},{status,headers});
const threshold=(seconds:number)=>Math.min(30,seconds*.5);
const safeOrigin=(request:NextRequest)=>{
 const origin=request.headers.get('origin');
 return request.headers.get('sec-fetch-site')!=='cross-site'&&(!origin||origin===new URL(request.url).origin);
};

// Anonymous plays use a stable, httpOnly, first-party pseudonymous ID. No raw IP address is stored.
export async function POST(request:NextRequest){
 if(!safeOrigin(request))return bad('Invalid request origin.',403);
 if(Number(request.headers.get('content-length')||0)>2048)return bad('Request too large.',413);
 let body:Record<string,unknown>;
 try{body=await request.json();}catch{return bad('Invalid listening request.');}
 const releaseId=body.releaseId,sessionId=body.sessionId,action=body.action;
 if(typeof releaseId!=='string'||!uuidPattern.test(releaseId)||typeof sessionId!=='string'||!uuidPattern.test(sessionId)||!['start','qualify'].includes(String(action)))return bad('Invalid listening session.');
 const admin=createAdminClient();
 try{
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  let visitor=request.cookies.get(COOKIE)?.value;
  let newlyMinted=false;
  if(!user&&(!visitor||!uuidPattern.test(visitor))){
   if(action!=='start')return bad('Listening session expired.',409);
   visitor=randomUUID();newlyMinted=true;
  }
  const listenerKey=user?'account:'+user.id:'visitor:'+createHash('sha256').update(visitor!).digest('hex');
  if(action==='start'){
   const seconds=Number(body.duration);
   const source=['billboard','release','public-player'].includes(String(body.source))?String(body.source):'public-player';
   if(!Number.isFinite(seconds)||seconds<3||seconds>14400)return bad('Track duration is unavailable.');
   const {data:release,error:releaseError}=await admin.from('music_weekly_chart').select('id').eq('id',releaseId).maybeSingle();
   if(releaseError)return bad('Listening is temporarily unavailable.',503);
   if(!release)return bad('This song is not available.',404);
   const {error}=await admin.from('music_play_sessions').insert({
    id:sessionId,release_id:releaseId,user_id:user?.id||null,listener_key:listenerKey,
    duration_seconds:Math.round(seconds),source
   });
   if(error){
    if(error.code!=='23505')return bad('Could not start measurement.',503);
    const {data:existing}=await admin.from('music_play_sessions').select('id').eq('id',sessionId).eq('release_id',releaseId).eq('listener_key',listenerKey).maybeSingle();
    if(!existing)return bad('This listening session is already in use.',409);
   }
   const response=NextResponse.json({ok:true,started:true},{headers});
   if(newlyMinted)response.cookies.set(COOKIE,visitor!,{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/',maxAge:31536000});
   return response;
  }
  const seconds=Number(body.listenedSeconds);
  if(!Number.isFinite(seconds)||seconds<0||seconds>14400)return bad('Invalid listening progress.');
  const {data:record,error}=await admin.from('music_play_sessions')
   .select('id,release_id,listener_key,duration_seconds,started_at,qualified_at')
   .eq('id',sessionId).eq('release_id',releaseId).eq('listener_key',listenerKey).maybeSingle();
  if(error)return bad('Listening verification unavailable.',503);
  if(!record)return bad('Listening session not found.',404);
  if(record.qualified_at)return NextResponse.json({ok:true,counted:false,reason:'already-counted'},{headers});
  const required=threshold(record.duration_seconds);
  const elapsed=(Date.now()-new Date(record.started_at).getTime())/1000;
  // Tolerates legal 2x speed but not instant client progress or seeking.
  if(seconds<required||elapsed<Math.max(1,required/2-1))return bad('Listening threshold has not been reached.',422);
  const since=new Date(Date.now()-3600000).toISOString();
  const {count,error:countError}=await admin.from('music_play_sessions').select('id',{count:'exact',head:true})
   .eq('listener_key',listenerKey).eq('release_id',releaseId).gte('qualified_at',since);
  if(countError)return bad('Listening verification unavailable.',503);
  if((count||0)>=3)return NextResponse.json({ok:true,counted:false,reason:'repeat-limit'},{headers});
  const {data:saved,error:saveError}=await admin.from('music_play_sessions')
   .update({qualified_at:new Date().toISOString(),qualified_bucket:Math.floor(Date.now()/900000),listened_seconds:Math.floor(Math.min(seconds,record.duration_seconds))})
   .eq('id',sessionId).is('qualified_at',null).select('id');
  if(saveError?.code==='23505')return NextResponse.json({ok:true,counted:false,reason:'duplicate-window'},{headers});
  if(saveError)return bad('Play could not be recorded.',503);
  return NextResponse.json({ok:true,counted:Boolean(saved?.length)},{headers});
 }catch{
  return bad('Listening is temporarily unavailable.',503);
 }
}
