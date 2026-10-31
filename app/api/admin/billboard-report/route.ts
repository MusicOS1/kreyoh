import {NextRequest} from 'next/server';
import {getControlRoomAccess,hasControlRoomPermission} from '../../../../lib/controlRoom';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {chart} from '../../../../lib/community';
export const dynamic='force-dynamic';
const valid=/^\d{4}-\d{2}-\d{2}$/;
const csv=(value:unknown)=>{
 let text=String(value??'');
 if(/^[=+@-]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
};
export async function GET(request:NextRequest){
 const access=await getControlRoomAccess();
 if(!access.user||!access.authorised||!await hasControlRoomPermission(access.user.id,'reports'))return Response.json({error:'Not permitted'},{status:403});
 const url=new URL(request.url),start=url.searchParams.get('from'),end=url.searchParams.get('to');
 if(!start||!end||!valid.test(start)||!valid.test(end)||start>end||Date.parse(end)-Date.parse(start)>366*86400000||end>new Date(Date.now()+3*3600000).toISOString().slice(0,10))
  return Response.json({error:'Choose a valid report period.'},{status:400});
 try{
  const [releases,metrics]=await Promise.all([
   chart(),createAdminClient().rpc('billboard_metrics',{p_from:start,p_to:end})
  ]);
  if(metrics.error)return Response.json({error:'Measurement migration not installed.'},{status:503});
  const byId=new Map((metrics.data||[]).map((r:any)=>[r.release_id,r]));
  const rows=releases.map(release=>({release,metrics:byId.get(release.id)||{}}))
   .sort((a,b)=>(Number((b.metrics as any).chart_score)||0)-(Number((a.metrics as any).chart_score)||0));
  const output=[
   ['Rank','Song','Artist','Period start EAT','Period end EAT','Qualified plays','Unique listeners per song','Active song likes','New active likes','Artist followers','Net follower change','Votes','Chart score'],
   ...rows.map(({release:r,metrics:m},i)=>[i+1,r.title,r.artist_name,start,end,
    (m as any).plays||0,(m as any).unique_listeners||0,(m as any).likes||0,(m as any).period_likes||0,
    (m as any).followers||0,(m as any).follower_growth||0,(m as any).votes||0,(m as any).chart_score||0])
  ].map(line=>line.map(csv).join(',')).join('\r\n');
  return new Response('\uFEFF'+output,{headers:{
   'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="FACKTS Billboard Analytics ${start} to ${end}.csv"`,
   'Cache-Control':'private, no-store'
  }});
 }catch{return Response.json({error:'Could not generate report.'},{status:503});}
}
