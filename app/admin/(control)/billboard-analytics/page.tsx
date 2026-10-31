import Link from 'next/link';
import {requireControlRoomPermission} from '../../../../lib/controlRoom';
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
export default async function BillboardAnalytics({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 await requireControlRoomPermission('reports');
 const range=chooseRange(await searchParams),admin=createAdminClient();
 const [chartRows,measurements]=await Promise.all([
  chart(),admin.rpc('billboard_metrics',{p_from:range.from,p_to:range.to})
 ]);
 const ready=!measurements.error;
 const byId=new Map((measurements.data||[]).map((row:Metrics)=>[row.release_id,row]));
 const rows=chartRows.map(release=>({release,stats:byId.get(release.id)}))
  .sort((a,b)=>(Number(b.stats?.chart_score)||0)-(Number(a.stats?.chart_score)||0)
   ||(Number(b.stats?.plays)||0)-(Number(a.stats?.plays)||0));
 const sum=(key:keyof Metrics)=>rows.reduce((total,row)=>total+Number(row.stats?.[key]||0),0);
 const uniqueArtists=new Map<string,number>();
 for(const row of rows)if(!uniqueArtists.has(row.release.artist_id))uniqueArtists.set(row.release.artist_id,Number(row.stats?.followers||0));
 const followers=Array.from(uniqueArtists.values()).reduce((a,b)=>a+b,0);
 const numbers=[['Qualified plays',sum('plays')],['Song likes',sum('likes')],['Artist followers',followers],['Fan votes',sum('votes')],['New likes',sum('period_likes')],['Net new follows',sum('follower_growth')]];
 const query='from='+encodeURIComponent(range.from)+'&to='+encodeURIComponent(range.to);
 return <main className="community-page member-community">
  <Link href="/admin">← Control Room</Link>
  <header className="control-hero"><div><span className="control-eyebrow">MUSIC INTELLIGENCE</span><h1>Billboard Analytics</h1><p>Qualified listening, distinct likes, artist follow growth and community votes. Real recorded events only.</p></div></header>
  <form method="GET" className="community-actions" aria-label="Report period">
   <label>From <input type="date" name="from" defaultValue={range.from} required/></label>
   <label>To <input type="date" name="to" defaultValue={range.to} required/></label>
   <button type="submit">Update report</button>
   {ready&&<><a href={'/api/admin/billboard-report?'+query}>Export CSV</a><ReportPrint/></>}
  </form>
  <p>Reporting period: {range.from} to {range.to} · Africa/Nairobi calendar days. Rankings normalize each factor within the selected period.</p>
  {!ready?<section className="community-card"><h2>Measurement setup pending</h2><p>The dedicated measurement migration has not been installed on this database. Existing music records remain available; play and like totals must not be guessed.</p></section>:<>
   <section className="control-metrics">{numbers.map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{Number(value).toLocaleString('en-KE')}</strong><small>Recorded activity / current active totals</small></article>)}</section>
   <section className="community-card"><h2>Ranked song performance</h2>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
     <thead><tr><th scope="col">#</th><th scope="col">Song / Artist</th><th scope="col">Plays</th><th scope="col">Unique listeners</th><th scope="col">Likes</th><th scope="col">Followers</th><th scope="col">Net follows</th><th scope="col">Votes</th><th scope="col">Score</th></tr></thead>
     <tbody>{rows.map(({release:r,stats:s},index)=><tr key={r.id}>
      <td>{index+1}</td><td><strong>{r.title}</strong><div>{r.artist_name}</div></td>
      <td>{s?.plays??0}</td><td>{s?.unique_listeners??0}</td><td>{s?.likes??0}</td><td>{s?.followers??0}</td><td>{s?.follower_growth??0}</td><td>{s?.votes??0}</td><td>{s?.chart_score??0}</td>
     </tr>)}</tbody>
    </table></div>
   </section>
   <p className="community-note">Rules: a qualified play requires 30 seconds, or 50% for tracks shorter than 60 seconds; seeks do not count. One active like per verified account, separate from saves. Follower growth records follow and unfollow actions after tracking activation. Repeat plays are restricted by verified listener and time window. Per-song unique listener totals cannot be summed into a platform-wide unique audience count.</p>
  </>}
 </main>;
}
