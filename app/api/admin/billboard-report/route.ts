import {NextRequest} from 'next/server';
import {getControlRoomAccess,hasControlRoomPermission} from '../../../../lib/controlRoom';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {chart} from '../../../../lib/community';
export const dynamic='force-dynamic';
const valid=/^\d{4}-\d{2}-\d{2}$/;
const csv=(value:unknown)=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
export async function GET(request:NextRequest){
 const access=await getControlRoomAccess();
 if(!access.user||!access.authorised||!(await hasControlRoomPermission(access.user.id,'music')||await hasControlRoomPermission(access.user.id,'reports')))
  return Response.json({error:'Not permitted'},{status:403});
 const url=new URL(request.url),from=url.searchParams.get('from'),to=url.searchParams.get('to');
 if(!from||!to||!valid.test(from)||!valid.test(to)||from>to||Date.parse(to)-Date.parse(from)>366*86400000||to>new Date(Date.now()+3*3600000).toISOString().slice(0,10))
  return Response.json({error:'Choose a valid report period.'},{status:400});
 try{
  const [releases,metrics]=await Promise.all([chart(),createAdminClient().rpc('billboard_metrics',{p_from:from,p_to:to})]);
  const ready=!metrics.error;
  const byId=new Map<string,any>((metrics.data||[]).map((r:any)=>[r.release_id,r]));
  const output=[
   ['Song','Artist','From (Kenya time)','To (Kenya time)','Qualified plays','Unique listeners per song','Active likes','Saves','Comments','Artist followers','Net new follows','Weekly votes','Billboard score'],
   ...releases.map((r:any)=>{
    const m=byId.get(r.id);
    return [r.title,r.artist_name,from,to,
     ready?m?.plays??0:r.plays??'Not tracked',ready?m?.unique_listeners??0:r.unique_listeners??'Not tracked',
     r.likes??'Not tracked',r.saves??'Unavailable',r.comments??'Unavailable',r.followers??'Unavailable',
     ready?m?.follower_growth??0:'Not tracked',r.votes??0,ready?m?.chart_score??0:'Not tracked'];
   })
  ].map(row=>row.map(csv).join(',')).join('\r\n');
  return new Response('\uFEFF'+output,{headers:{'Content-Type':'text/csv; charset=utf-8',
   'Content-Disposition':`attachment; filename="FACKTS Public Music Analytics ${from} to ${to}.csv"`,'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not generate the public music report.'},{status:503});}
}
