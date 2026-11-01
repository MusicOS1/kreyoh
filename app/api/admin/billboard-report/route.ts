import {NextRequest} from 'next/server';
import {getControlRoomAccess,hasControlRoomPermission} from '../../../../lib/controlRoom';
import {chart} from '../../../../lib/community';
import {publicPlayStats,publicArtistAudience,reportRange,kenyaToday} from '../../../../lib/publicMusicReporting';
export const dynamic='force-dynamic';
const csv=(input:unknown)=>{
 let s=String(input??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';
};
export async function GET(request:NextRequest){
 const access=await getControlRoomAccess();
 if(!access.user||!access.authorised||!(await hasControlRoomPermission(access.user.id,'music')||await hasControlRoomPermission(access.user.id,'reports')))return Response.json({error:'Not permitted'},{status:403});
 const url=new URL(request.url),from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to||to>kenyaToday()||Date.parse(to)-Date.parse(from)>366*86400000)return Response.json({error:'Choose a valid report period.'},{status:400});
 const range=reportRange({from,to}),view=url.searchParams.get('view')==='artists'?'artists':'songs';
 try{
  const [releases,stats,artists]=await Promise.all([chart(),publicPlayStats(range.from,range.to),publicArtistAudience(range.from,range.to)]);
  const byId=new Map(stats.map(row=>[row.release_id,row]));
  const byName=new Map<string,{likes:number;comments:number}>();
  for(const r of releases){const key=r.artist_name.toLowerCase().trim(),v=byName.get(key)||{likes:0,comments:0};v.likes+=r.likes||0;v.comments+=r.comments||0;byName.set(key,v);}
  const matrix=view==='artists'?
  [['Credited artist','Published songs','Lifetime qualified plays','Plays in period','Distinct listeners in period','Song likes','Song comments','From','To'],
   ...artists.map(a=>[a.credited_artist,a.songs,a.lifetime_plays,a.period_plays,a.period_listeners,byName.get(a.credited_artist.toLowerCase().trim())?.likes||0,byName.get(a.credited_artist.toLowerCase().trim())?.comments||0,range.from,range.to])]:
  [['Song','Credited artist','Lifetime qualified plays','Plays in period','Unique listeners in period','Listening starts in period','Active likes','Comments','Saves','From','To'],
   ...releases.map(r=>{const m=byId.get(r.id);return [r.title,r.artist_name,m?.lifetime_plays||0,m?.period_plays||0,m?.period_listeners||0,m?.period_starts||0,r.likes??'unavailable',r.comments??'unavailable',r.saves??'unavailable',range.from,range.to]})];
  const output=matrix.map(row=>row.map(csv).join(',')).join('\r\n');
  return new Response('\uFEFF'+output,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="FACKTS Music ${view} ${range.from} to ${range.to}.csv"`,'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Could not create music report.'},{status:503});}
}
