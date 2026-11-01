import Link from 'next/link';
import {requireControlRoomAdmin,getControlRoomPermissions} from '../../../../lib/controlRoom';
import {chart} from '../../../../lib/community';
import {publicPlayStats,publicArtistAudience,publicPlatformAudience,publicDailyPlays,reportRange} from '../../../../lib/publicMusicReporting';
import ReportPrint from '../../../../components/ReportPrint';
export const dynamic='force-dynamic';
const n=(value:number)=>value.toLocaleString('en-KE');
export default async function PublicMusicAnalytics({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 const admin=await requireControlRoomAdmin(),permissions=await getControlRoomPermissions(admin.id);
 if(!permissions.some(p=>['all','music','reports'].includes(p)))throw Error('Music analytics permission required.');
 const range=reportRange(await searchParams);
 const [songs,stats,artists,audience,days]=await Promise.all([
  chart(),publicPlayStats(range.from,range.to),publicArtistAudience(range.from,range.to),
  publicPlatformAudience(range.from,range.to),publicDailyPlays(range.from,range.to)
 ]);
 const perSong=new Map(stats.map(row=>[row.release_id,row]));
 const sums={plays:stats.reduce((t,r)=>t+r.lifetime_plays,0),period:stats.reduce((t,r)=>t+r.period_plays,0),
  starts:stats.reduce((t,r)=>t+r.period_starts,0),started:stats.reduce((t,r)=>t+r.lifetime_starts,0),
  likes:songs.reduce((t,r)=>t+(r.likes||0),0),comments:songs.reduce((t,r)=>t+(r.comments||0),0)};
 const credited=new Map<string,{likes:number;comments:number;followers:number;songs:number}>();
 for(const r of songs){const key=r.artist_name.toLowerCase().trim(),old=credited.get(key)||{likes:0,comments:0,followers:0,songs:0};
  credited.set(key,{likes:old.likes+(r.likes||0),comments:old.comments+(r.comments||0),followers:Math.max(old.followers,r.followers||0),songs:old.songs+1});}
 const rows=songs.map(song=>({song,metrics:perSong.get(song.id)})).sort((a,b)=>(b.metrics?.period_plays||0)-(a.metrics?.period_plays||0)||
  (b.metrics?.lifetime_plays||0)-(a.metrics?.lifetime_plays||0)||a.song.title.localeCompare(b.song.title));
 const query='from='+encodeURIComponent(range.from)+'&to='+encodeURIComponent(range.to);
 return <main className="community-page member-community">
  <Link href="/admin">← Control Room</Link>
  <header className="control-hero" style={{color:'#fff'}}><div><span className="control-eyebrow" style={{color:'#fff'}}>PUBLIC LISTENING</span><h1 style={{color:'#fff'}}>Music performance</h1><p style={{color:'#fff'}}>Real public plays. Every live song. Every credited artist.</p></div></header>
  <form method="GET" className="community-actions"><label>From <input type="date" name="from" defaultValue={range.from} required/></label><label>To <input type="date" name="to" defaultValue={range.to} required/></label><button type="submit">Apply dates</button><a href={'/api/admin/billboard-report?'+query}>Export CSV</a><ReportPrint/></form>
  <p>Selected period: {range.from} – {range.to} (Kenya time). Lifetime streams, likes, comments and followers are cumulative; selected-period streams and listeners are measured only inside those dates.</p>
  <section className="control-metrics">
   {([['All-time public plays',sums.plays],['Plays in selected period',sums.period],['Unique listeners in period',audience.period_listeners],['Listening sessions started',sums.starts],['Published songs',songs.length],['Likes on published songs',sums.likes],['Comments on published songs',sums.comments]] as const).map(([label,value])=><article key={label}><span>{label}</span><strong>{n(value)}</strong><small>Recorded data</small></article>)}
  </section>
  <section className="community-card">
   <h2>Tracking health</h2><p>{n(sums.started)} lifetime listening sessions started · {n(sums.plays)} qualified streams. A play is counted once the listener hears at least 30 seconds, or half of a shorter song. Skips and suspicious repeats do not earn a stream.</p>
   {sums.started===0?<p role="status">No public listening session starts have been received yet. If someone has played a public release on this preview, check the browser network request to /api/listening/plays; the counter should not be treated as verified operational until this works on a real device.</p>:sums.plays===0?<p role="status">Listening sessions exist, but none have qualified. Review playback duration, completion thresholds and failed verification requests.</p>:<p role="status">Qualified public streams are being recorded. Counts update when you refresh this report.</p>}
   <p><small>Public play measurement began on 1 November 2026. Earlier private track/version listens and file-open events are not counted as public streams. They have not been deleted.</small></p>
  </section>
  <section className="community-card"><h2>Artists · credited releases</h2>
   <p>Credited artist names are grouped separately from release-upload accounts. This prevents bulk uploads from incorrectly inflating an individual artist’s audience.</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>
    <th>Credited artist</th><th>Songs</th><th>All-time plays</th><th>Period plays</th><th>Period listeners</th><th>Likes</th><th>Comments</th>
   </tr></thead><tbody>{artists.map(a=>{const extras=credited.get(a.credited_artist.toLowerCase().trim());return <tr key={a.credited_artist}><td><strong>{a.credited_artist}</strong></td><td>{n(a.songs)}</td><td>{n(a.lifetime_plays)}</td><td>{n(a.period_plays)}</td><td>{n(a.period_listeners)}</td><td>{n(extras?.likes||0)}</td><td>{n(extras?.comments||0)}</td></tr>})}</tbody></table></div>
  </section>
  <section className="community-card"><h2>All published songs · {rows.length}</h2>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Song</th><th>Credited artist</th><th>Lifetime plays</th><th>Period plays</th><th>Period listeners</th><th>Starts</th><th>Likes</th><th>Comments</th><th>Last qualified play</th></tr></thead><tbody>{rows.map(({song,metrics})=><tr key={song.id}>
    <td><Link href={'/billboard/'+song.id}>{song.title}</Link></td><td>{song.artist_name}</td>
    <td>{n(metrics?.lifetime_plays??0)}</td><td>{n(metrics?.period_plays??0)}</td><td>{n(metrics?.period_listeners??0)}</td><td>{n(metrics?.period_starts??0)}</td><td>{n(song.likes??0)}</td><td>{n(song.comments??0)}</td><td>{metrics?.last_play_at?new Date(metrics.last_play_at).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi'}):'—'}</td>
   </tr>)}</tbody></table></div>
  </section>
  <section className="community-card"><h2>Daily public listening</h2>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Day (Kenya)</th><th>Play starts</th><th>Qualified plays</th><th>Unique listeners</th></tr></thead>
   <tbody>{days.slice(-31).map(day=><tr key={day.day}><td>{day.day}</td><td>{n(day.starts)}</td><td>{n(day.plays)}</td><td>{n(day.unique_listeners)}</td></tr>)}</tbody></table></div>
  </section>
 </main>;
}
