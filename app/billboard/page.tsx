import Link from "next/link";
import {fanHeroSettings} from "../../lib/fanHero";
import ConfiguredFanHero from "../../components/ConfiguredFanHero";
import PublicNavigation from "../../components/PublicNavigation";
import PublicFooter from "../../components/PublicFooter";
import BillboardChart,{type ChartEntry} from "../../components/BillboardChart";
import {chart,viewer,currentChartWeek} from "../../lib/community";
import {createAdminClient} from "../../lib/supabase/admin";
import "./billboard.css";

export const dynamic="force-dynamic";
export const metadata={title:"FACKTS Billboard | Weekly Music Chart",description:"The ranked music chart for independent FACKTS artists. Discover, play and support real releases."};
export default async function Billboard({searchParams}:{searchParams:Promise<{collection?:string;artist?:string;q?:string}>}){
 const params=await searchParams;
 const [releases,user,heroSettings]=await Promise.all([chart(),viewer(),fanHeroSettings()]);
 const customHero=heroSettings.billboard.enabled?heroSettings.billboard:undefined;
 const votedResult=user?await createAdminClient().from("music_votes").select("release_id").eq("user_id",user.id).eq("week_start",currentChartWeek()):{data:[]};
 const votedIds=(votedResult.data||[]).map(row=>row.release_id);
 const query=(params.q||"").trim().slice(0,120).toLowerCase();
 const filtered=releases.filter(r=>
  (!params.collection||r.collection===params.collection)&&(!params.artist||r.artist_id===params.artist)&&
  (!query||[r.title,r.artist_name,r.collection||""].join(" ").toLowerCase().includes(query)));
 const entries:ChartEntry[]=filtered.map(r=>({
  id:r.id,artist_id:r.artist_id,title:r.title,artist_name:r.artist_name,
  collection:r.collection,has_cover:r.has_cover,votes:r.votes,explicit:r.explicit,debut:r.debut,
  release_at:r.release_at,position:releases.findIndex(x=>x.id===r.id)+1
 }));
 const week=new Date(currentChartWeek()+"T12:00:00+03:00");
 const dateLabel=new Intl.DateTimeFormat("en-KE",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Nairobi"}).format(week);
 const isFiltered=Boolean(params.collection||params.artist||query);
 return <><PublicNavigation/><main className="fm-chart-page">
  {customHero?<div className="fm-billboard-custom">
   <ConfiguredFanHero hero={customHero}/>
   <div className="fc-chart-meta"><span>WEEK OF {dateLabel.toUpperCase()}</span><span>{releases.length} LIVE SONGS</span><span>UPDATED WEEKLY</span></div>
  </div>:<header className="fc-chart-header">
   <div className="fc-brand-kicker"><span className="fc-orange-bar"/> FACKTS MUSIC CHARTS</div>
   <div className="fc-header-grid">
    <div><h1>FACKTS <span>BILLBOARD.</span></h1>
     <p>The songs moving the FACKTS community. Discover independent music, listen and help your favourite artists climb.</p>
     <div className="fc-chart-meta"><span>WEEK OF {dateLabel.toUpperCase()}</span><span>{releases.length} LIVE SONGS</span><span>UPDATED WEEKLY</span></div></div>
    <div className="fc-header-number" aria-label={"Top "+releases.length+" releases"}>TOP <strong>{Math.min(40,releases.length)||"—"}</strong></div>
   </div>
  </header>}
  <div className="fc-chart-toolbar">
   <div className="fc-chart-toolbar-copy"><strong>{isFiltered?"Filtered chart":"This week's rankings"}</strong><span>Discover the music behind the numbers.</span></div>
   <form className="fc-chart-search" method="get" action="/billboard">
    <label className="fc-sr-only" htmlFor="fc-chart-q">Search songs or artists</label>
    <input id="fc-chart-q" name="q" defaultValue={params.q||""} maxLength={120} placeholder="Search songs or artists"/>
    <button type="submit">Search</button>
   </form>
  </div>
  {isFiltered&&<div className="fc-back-chart"><Link href="/billboard">← Full Billboard</Link></div>}
  <BillboardChart entries={entries} allCount={releases.length} userId={user?.id} votedIds={votedIds} featured={!isFiltered}/>
  <div className="fc-chart-outro"><div><span>YOUR NEXT FAVOURITE</span><h2>Starts with an artist.</h2></div><Link href="/creators">Discover FACKTS artists ↗</Link></div>
 </main><PublicFooter/></>;
}
