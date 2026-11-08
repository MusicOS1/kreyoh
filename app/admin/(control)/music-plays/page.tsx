import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import styles from "./music-plays.module.css";

type PlayStat={releaseId:string;lifetime:number;period:number;starts:number;listeners:number;lastPlay:string|null};
const safeNumber=(value:unknown)=>Math.max(0,Number(value)||0);
const since=(days:number)=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);

export default async function MusicPlaysPage({searchParams}:{
 searchParams:Promise<{range?:string;q?:string}>
}){
 await requireControlRoomPermission("music");
 const {range,q}=await searchParams;
 const days=[7,30,90,365].includes(Number(range))?Number(range):30;
 const term=(q||"").trim().slice(0,100);
 const admin=createAdminClient();
 const {data,error}=await admin.rpc("public_music_play_stats",{
  p_from:since(days),p_to:new Date().toISOString().slice(0,10)
 });
 const stats:PlayStat[]=(data||[]).map((item:any)=>({
  releaseId:String(item.release_id),
  lifetime:safeNumber(item.lifetime_plays),
  period:safeNumber(item.period_plays),
  starts:safeNumber(item.period_starts),
  listeners:safeNumber(item.period_listeners),
  lastPlay:typeof item.last_play_at==="string"?item.last_play_at:null
 })).sort((a:PlayStat,b:PlayStat)=>b.period-a.period||b.lifetime-a.lifetime);
 const ids=stats.map(stat=>stat.releaseId);
 const {data:releases,error:namesError}=!error&&ids.length
  ?await admin.from("music_releases").select("id,title,artist_name").in("id",ids)
  :{data:[],error:null};
 const names=new Map((releases||[]).map((r:{id:string;title:string;artist_name:string})=>[r.id,r]));
 const rows=term?stats.filter(stat=>{
  const release=names.get(stat.releaseId);
  return (release?.title||"").toLowerCase().includes(term.toLowerCase())||
   (release?.artist_name||"").toLowerCase().includes(term.toLowerCase());
 }):stats;
 const total=(key:"lifetime"|"period"|"starts")=>stats.reduce((sum,row)=>sum+row[key],0);
 const format=(value:number)=>value.toLocaleString("en-KE");
 const fail=Boolean(error||namesError);
 return <main className={styles.page}>
  <header className={styles.intro}>
   <div>
    <span className={styles.eyebrow}>FACKTS MUSIC / LISTENING INTELLIGENCE</span>
    <h1>Music plays</h1>
    <p>Every published song, one dedicated dashboard. Review recorded qualified plays, session starts, listeners and the latest listening activity.</p>
   </div>
   <div className={styles.actions}>
    <Link href="/admin/analytics">All analytics</Link>
    <Link href="/admin/releases">Manage releases</Link>
   </div>
  </header>
  {fail?<section className={styles.error} role="alert">
   <h2>Music analytics unavailable</h2>
   <p>Play counts could not be read. We will not substitute zeroes or invent listening data.</p>
   <Link href="/admin/music-plays">Try again</Link>
  </section>:<>
   <section className={styles.stats} aria-label="Listening totals">
    <article className={styles.stat}><span>Recorded lifetime plays</span><strong>{format(total("lifetime"))}</strong><small>All instrumented releases</small></article>
    <article className={styles.stat}><span>Qualified plays · {days} days</span><strong>{format(total("period"))}</strong><small>Meaningful recorded listens</small></article>
    <article className={styles.stat}><span>Session starts · {days} days</span><strong>{format(total("starts"))}</strong><small>Not all starts become plays</small></article>
    <article className={styles.stat}><span>Published songs tracked</span><strong>{format(stats.length)}</strong><small>Including releases with zero plays</small></article>
   </section>
   <section className={styles.panel} aria-labelledby="music-plays-table-title">
    <div className={styles.toolbar}>
     <div>
      <h2 id="music-plays-table-title">Song-level activity</h2>
      <p>Showing {format(rows.length)} of {format(stats.length)} releases</p>
     </div>
     <nav className={styles.periods} aria-label="Listening date range">
      {[7,30,90,365].map(day=><Link key={day}
       className={day===days?styles.current:styles.period}
       aria-current={day===days?"page":undefined}
       href={`/admin/music-plays?range=${day}${term?"&q="+encodeURIComponent(term):""}`}>{day} days</Link>)}
     </nav>
    </div>
    <form className={styles.filter} action="/admin/music-plays" method="get">
     <input type="hidden" name="range" value={days}/>
     <label htmlFor="music-play-search">Find a song or artist</label>
     <div><input id="music-play-search" name="q" type="search" maxLength={100} defaultValue={term} placeholder="Search song titles or artists…"/>
      <button type="submit">Search</button></div>
    </form>
    <div className={styles.tableWrap}>
     <table className={styles.table}>
      <thead><tr>
       <th scope="col">Published release</th>
       <th scope="col" className={styles.number}>Lifetime plays</th>
       <th scope="col" className={styles.number}>{days}-day plays</th>
       <th scope="col" className={styles.number}>Session starts</th>
       <th scope="col" className={styles.number}>Listeners</th>
       <th scope="col">Last qualified play</th>
      </tr></thead>
      <tbody>
       {rows.map(item=>{
        const release=names.get(item.releaseId);
        return <tr key={item.releaseId}>
         <td className={styles.song}><Link href={`/billboard/${item.releaseId}`}>{release?.title||"Release"}</Link>
          <span>{release?.artist_name||"Artist unavailable"}</span></td>
         <td className={styles.number}>{format(item.lifetime)}</td>
         <td className={styles.number}>{format(item.period)}</td>
         <td className={styles.number}>{format(item.starts)}</td>
         <td className={styles.number}>{format(item.listeners)}</td>
         <td className={styles.last}>{item.lastPlay?new Date(item.lastPlay).toLocaleString("en-KE",{
          timeZone:"Africa/Nairobi",dateStyle:"medium",timeStyle:"short"
         }):"Not recorded"}</td>
        </tr>;
       })}
      </tbody>
     </table>
     {!rows.length&&<p className={styles.empty}>{term?"No songs match that search.":"No published releases are currently eligible for listening analytics."}</p>}
    </div>
    <p className={styles.note}>Qualified plays are based on meaningful recorded listening. Separate qualifying replays may count; a click alone does not count. This dashboard uses the existing music-play records and cannot reconstruct listening before tracking began. Listener figures are unique within the selected period, not lifetime followers.</p>
   </section>
  </>}
 </main>;
}
