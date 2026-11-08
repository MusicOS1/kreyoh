"use client";
import Link from "next/link";
import {useListening} from "./ListeningProvider";
import {PlayIcon,ArrowUpRight} from "./Icons";
import MusicPlayCount from "./MusicPlayCount";
import {VoteButton,ShareRelease,ReleaseVoteCount} from "./ReleaseControls";

export type ChartEntry={id:string;artist_id:string;title:string;artist_name:string;collection:string|null;
 has_cover:boolean;votes:number;plays?:number|null;explicit?:boolean;debut?:boolean;release_at:string;position:number};
type Props={entries:ChartEntry[];allCount:number;userId?:string;votedIds:string[];featured:boolean};
const cover=(r:ChartEntry)=>"/api/releases/"+encodeURIComponent(r.id)+"/media?kind=cover";

function ChartActions({r,userId,voted}:{r:ChartEntry;userId?:string;voted:boolean}){
 return <div className="fc-chart-actions">
  {userId?<VoteButton id={r.id} voted={voted} own={userId===r.artist_id}/>:
   <Link href={"/login?next="+encodeURIComponent("/billboard/"+r.id)}>Sign in to vote</Link>}
  <ShareRelease id={r.id} title={r.title}/>
 </div>;
}
export default function BillboardChart({entries,allCount,userId,votedIds,featured}:Props){
 const {play,progress}=useListening();
 const voted=new Set(votedIds);
 const stars=featured?entries.slice(0,3):[];
 const more=featured?entries.slice(3):entries;
 return <div className="fc-chart">
  {stars.length>0&&<section className="fc-podium" aria-label="Highest ranked songs">
   {stars.map((r,index)=><article className={"fc-podium-card"+(index===0?" fc-number-one":"")} key={r.id}>
    <div className="fc-podium-top"><span className="fc-podium-number">{String(r.position).padStart(2,"0")}</span>
     <span className="fc-rank-kicker">{index===0?"NO. 1 THIS WEEK":"TOP THREE"}</span></div>
    <div className="fc-podium-art">
     {r.has_cover?<img src={cover(r)} alt={r.title+" artwork"} loading={index===0?"eager":"lazy"}/>:<div className="fc-art-placeholder">♫</div>}
     <button type="button" className="fc-art-play" onClick={()=>play(r.id)} aria-label={"Play "+r.title}>
      <PlayIcon size={22}/></button>
    </div>
    <div className="fc-podium-text"><Link href={"/billboard/"+r.id}><h2>{r.title}</h2></Link><p>{r.artist_name}</p>
     <div className="fc-rank-stats"><span><MusicPlayCount id={r.id} count={r.plays}/></span><span><ReleaseVoteCount id={r.id} count={r.votes}/> this week</span></div></div>
    <ChartActions r={r} userId={userId} voted={voted.has(r.id)}/>
   </article>)}
  </section>}
  <section className="fc-chart-chartlist" aria-label="Full ranked chart">
   <div className="fc-list-title"><div><span>THE CHART</span><h2>{featured?"The rest of the rankings":"Search results"}</h2></div>
    <span>{allCount} published songs</span></div>
   <div className="fc-list-legend"><span>POS.</span><span>TRACK / ARTIST</span><span>THIS WEEK</span><span>ACTIONS</span></div>
   {more.map(r=><article className="fc-chart-row" key={r.id}>
    <div className="fc-chart-rank" aria-label={"Rank "+r.position}>{String(r.position).padStart(2,"0")}</div>
    <div className="fc-chart-song">
     <button type="button" className="fc-chart-cover" onClick={()=>play(r.id)} aria-label={"Play "+r.title}>
      {r.has_cover?<img src={cover(r)} alt="" loading="lazy"/>:<span>♫</span>}
      <span className="fc-cover-play"><PlayIcon size={19}/></span>
     </button>
     <div className="fc-chart-song-title"><Link href={"/billboard/"+r.id}><strong>{r.title}</strong></Link>
      <span>{r.artist_name}</span>{r.collection&&<small>{r.collection}</small>}</div>
    </div>
    <div className="fc-row-votes"><strong><MusicPlayCount id={r.id} count={r.plays}/></strong><small><ReleaseVoteCount id={r.id} count={r.votes}/> votes</small></div>
    <div className="fc-row-actions"><ChartActions r={r} userId={userId} voted={voted.has(r.id)}/>
      <Link className="fc-song-more" href={"/billboard/"+r.id} aria-label={"Details for "+r.title}><ArrowUpRight size={17}/></Link></div>
   </article>)}
   {!entries.length&&<div className="fc-no-results">No matching releases. <Link href="/billboard">View the full chart</Link>.</div>}
   {featured&&stars.length===entries.length&&stars.length>0&&<p className="fc-all-featured">All ranked songs are shown above.</p>}
  </section>
  <p className="fc-chart-method">Ranked by recorded qualified listens, with weekly fan votes breaking ties. Votes reset Mondays at 00:00 EAT. Plays are lifetime counts since tracking was enabled.</p>
 </div>;
}
