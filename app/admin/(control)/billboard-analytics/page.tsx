import Link from 'next/link';
import {getControlRoomPermissions,requireControlRoomAdmin} from '../../../../lib/controlRoom';
import {createAdminClient} from '../../../../lib/supabase/admin';
import {chart,currentChartWeek} from '../../../../lib/community';
import ReportPrint from '../../../../components/ReportPrint';
export const dynamic='force-dynamic';
type Metrics={release_id:string;plays:number;unique_listeners:number;likes:number;period_likes:number;followers:number;follower_growth:number;votes:number;chart_score:number};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function chooseRange(params:{from?:string;to?:string}){
 const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
 const from=datePattern.test(params.from||'')?params.from!:currentChartWeek();
 const to=datePattern.test(params.to||'')?params.to!:today;
 if(from>to||Date.parse(to)-Date.parse(from)>366*86400000||to>today)return {from:currentChartWeek(),to:today};
 return {from,to};
}
const number=(n:number|null|undefined)=>typeof n==='number'?n.toLocaleString('en-KE'):'—';
export default async function PublicMusicAnalytics({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 const user=await requireControlRoomAdmin();
 const permissions=await getControlRoomPermissions(user.id);
 if(!permissions.some(p=>p==='all'||p==='music'||p==='reports'))throw Error('Music analytics access required.');
 const range=chooseRange(await searchParams),admin=createAdminClient();
 const [publicReleases,measurements]=await Promise.all([chart(),admin.rpc('billboard_metrics',{p_from:range.from,p_to:range.to})]);
 const ready=!measurements.error;
 const byId=new Map<string,Metrics>((measurements.data||[]).map((row:Metrics)=>[row.release_id,row] as const));
 const rows=publicReleases.map(release=>({release,stats:byId.get(release.id)}))
 .sort((a,b)=>(Number(b.stats?.plays||b.release.plays||0)-Number(a.stats?.plays||a.release.plays||0))||
  a.release.artist_name.localeCompare(b.release.artist_name)||a.release.title.localeCompare(b.release.title));
 const sum=(field:keyof Metrics)=>ready?rows.reduce((n,r)=>n+Number(r.stats?.[field]||0),0):null;
 const sumCurrent=(field:'saves'|'comments')=>rows.some(r=>r.release[field]!==null)?
 rows.reduce((n,r)=>n+Number(r.release[field]||0),0):null;
 const uniqueArtistFollowers=new Map<string,number|null>();
 for(const r of rows)if(!uniqueArtistFollowers.has(r.release.artist_id))
  uniqueArtistFollowers.set(r.release.artist_id,r.release.followers??null);
 const followers=Array.from(uniqueArtistFollowers.values());
 const followerTotal=followers.some(n=>n!==null)?followers.reduce<number>((n,x)=>n+(x||0),0):null;
 const totals:[string,number|null,string][]=[
  ['Public releases',rows.length,'All currently published songs'],
  ['Qualified plays',sum('plays'),'Selected date range · recorded only'],
  ['Song likes',rows.some(r=>typeof r.release.likes==='number')?rows.reduce((n,r)=>n+Number(r.release.likes||0),0):null,'Active likes · distinct from saves'],
  ['Song saves',sumCurrent('saves'),'Existing favourites · current total'],
  ['Song comments',sumCurrent('comments'),'Public, non-deleted comments'],
  ['Artist followers',followerTotal,'Distinct followed artist profiles'],
  ['New follows',sum('follower_growth'),'Net movement within date range'],
  ['Weekly votes',rows.reduce((n,r)=>n+Number(r.release.votes||0),0),'Existing Billboard vote records']
 ];
 const query='from='+encodeURIComponent(range.from)+'&to='+encodeURIComponent(range.to);
 return <main className="community-page member-community">
  <Link href="/admin">← Control Room</Link>
  <header className="control-hero" style={{color:'#fff'}}><div><span className="control-eyebrow" style={{color:'#fff'}}>PUBLIC LISTENING INTELLIGENCE</span><h1 style={{color:'#fff'}}>Public Music Analytics</h1><p style={{color:'#fff'}}>Every published song in the fan listening experience, not private production tracks. Measure actual plays, likes, saves, comments and artist follows.</p></div></header>
  <form method="GET" className="community-actions" aria-label="Report date range">
   <label>From <input type="date" name="from" defaultValue={range.from} required/></label>
   <label>To <input type="date" name="to" defaultValue={range.to} required/></label>
   <button type="submit">Update report</button>
   <a href={'/api/admin/billboard-report?'+query}>Export CSV</a><ReportPrint/>
  </form>
  <p>Date range: {range.from} – {range.to}, Kenya time. Current saves, active likes, existing comments and followers are lifetime/current totals; period filters apply only to dated measurement fields.</p>
  {!ready&&<p role="status">Qualified play and historical like/follow-trend tracking has not been activated on this database. Those values are shown as unavailable (—), not falsely reported as zero. Existing follows, saves, comments and votes remain visible.</p>}
  <section className="control-metrics">{totals.map(([label,value,caption])=><article key={label}><span>{label}</span><strong>{number(value)}</strong><small>{caption}</small></article>)}</section>
  <section className="community-card"><h2>All public releases · {rows.length} songs</h2>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
    <thead><tr><th scope="col">Song / Artist</th><th scope="col">Plays</th><th scope="col">Unique listeners</th><th scope="col">Likes</th><th scope="col">Saves</th><th scope="col">Comments</th><th scope="col">Artist followers</th><th scope="col">Follow change</th><th scope="col">Votes</th><th scope="col">Billboard score</th></tr></thead>
    <tbody>{rows.map(({release:r,stats:s})=><tr key={r.id}>
     <td><strong>{r.title}</strong><div>{r.artist_name}</div></td>
     <td>{number(ready?s?.plays:r.plays)}</td><td>{number(ready?s?.unique_listeners:r.unique_listeners)}</td>
     <td>{number(r.likes)}</td><td>{number(r.saves)}</td><td>{number(r.comments)}</td>
     <td>{number(r.followers)}</td><td>{number(ready?s?.follower_growth:null)}</td>
     <td>{number(r.votes)}</td><td>{number(ready?s?.chart_score:null)}</td>
    </tr>)}</tbody>
   </table></div>
  </section>
  <p className="community-note">All public catalogue songs are included. Private project songs and beats are excluded. A qualified play needs 30 seconds, or half a shorter track, and repeat protection. Existing song saves are not retrospective likes. Artist follower counts come from actual follows, counted once per artist in the total.</p>
 </main>;
}
