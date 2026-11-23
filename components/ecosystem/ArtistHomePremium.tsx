import Link from "../ProjectNavigationLink";
import {loadArtistInsights} from "../../lib/artistInsights";
import type {DashboardRow} from "../../lib/workspaceDashboard";
import ArtistHeroGallery from "./ArtistHeroGallery";
import ProjectTracksNavigator from "../ProjectTracksNavigator";
import styles from "./ArtistHomePremium.module.css";

type Props={
 identity:{id:string;name:string;avatar?:string|null};
 profile:any;
 project:any|null;
 availableProjects:{id:string;name?:string;code?:string}[];
 hasProjects:boolean;
 canCreateTrack:boolean;
 canScheduleSession:boolean;
 canUploadBeat:boolean;
 recent:DashboardRow[];
 recentUnavailable:boolean;
 insightDays?:7|30|90;
};
const format=(n:number|null)=>n===null?"—":n.toLocaleString("en-KE");
function validImages(profile:any,avatar?:string|null):string[]{
 const images=[profile?.hero_image_url,...(Array.isArray(profile?.photo_catalog)?profile.photo_catalog:[]),profile?.avatar_url,avatar];
 return [...new Set(images.filter((url:unknown):url is string=>{
   if(typeof url!=="string")return false;
   try{return new URL(url).protocol==="https:";}catch{return false;}
 }))].slice(0,5);
}
export default async function ArtistHomePremium({identity,profile,project,availableProjects,hasProjects,canCreateTrack,canScheduleSession,canUploadBeat,recent,recentUnavailable,insightDays=30}:Props){
 const insights=await loadArtistInsights(insightDays);
 const artistName=profile?.stage_name||profile?.nickname||profile?.full_name||identity.name||"Artist";
 const hasCurrentProject=Boolean(project);
 const projectName=project?.name||(hasProjects?"Choose a project":"Your music starts here");
 const projectSummary=project?.next_action||(project?"Your music, collaborators and production progress.":hasProjects?"Select a project to continue creating.":"Add your photos, start a project and make your first recording.");
 const projectHref=project?"/tracks#project-player":hasProjects?"/projects":"/projects?new=1#start-project";
 const hasPublished=Boolean(insights.releases&&insights.releases>0);
 const hasPlays=Boolean(insights.plays&&insights.plays>0);
 const metricCards=[
   {label:"Qualified plays",value:format(insights.plays),sub:"Last "+insightDays+" days",icon:"▶"},
   {label:"Unique listeners",value:format(insights.listeners),sub:"Distinct identifiable listeners",icon:"◉"},
   {label:"Followers",value:format(insights.followers),sub:"Currently following",icon:"♧"},
   {label:"New followers",value:format(insights.newFollowers),sub:"Last "+insightDays+" days",icon:"+"},
   {label:"Likes",value:format(insights.likes),sub:"On your published songs",icon:"♥"},
   {label:"Comments",value:format(insights.comments),sub:"On your published songs",icon:"✎"},
   {label:"Published releases",value:format(insights.releases),sub:"Currently live",icon:"♫"},
 ];
 const max=Math.max(1,...(insights.days||[]).map(d=>d.plays));
 const points=(insights.days||[]).map((d,i)=>String(14+i*541/Math.max(1,(insights.days?.length||1)-1))+","+String(140-(d.plays/max)*110)).join(" ");
 const startLabel=insights.days?.[0]?.day.slice(5)||"";
 const endLabel=insights.days?.at(-1)?.day.slice(5)||"";
 return <main className={styles.page}>
   <header className={styles.pageHeader}>
     <span className={styles.kicker}>FACKTS MUSIC / ARTIST</span>
     <h1>Artist home</h1>
     <p>{hasProjects?"Pick up where you left off.":"Start your music journey on FACKTS."}</p>
   </header>
   <ArtistHeroGallery name={artistName} projectName={projectName} projectSummary={projectSummary} projectHref={projectHref} hasProject={hasCurrentProject} hasProjects={hasProjects} photos={validImages(profile,identity.avatar)}/>
   <ProjectTracksNavigator projects={availableProjects} currentProjectId={project?.id}/>
   <section className={styles.insights} aria-label="Your artist insights">
     <header className={styles.sectionHeading}>
       <div><h2>Your insights</h2><p>Real performance and audience activity on FACKTS Music.</p></div>
       <nav className={styles.periodFilter} aria-label="Artist insights date range">
         {([7,30,90] as const).map(days=><Link key={days} href={"/workspaces/artist?period="+days} aria-current={insightDays===days?"page":undefined}>{days} days</Link>)}
       </nav>
     </header>
     <div className={styles.metrics}>
       {metricCards.map(card=><article className={styles.metric} key={card.label}>
         <span aria-hidden="true" className={styles.metricIcon}>{card.icon}</span>
         <div><span>{card.label}</span><strong>{card.value}</strong><small>{card.value==="—"?"Currently unavailable":card.sub}</small></div>
       </article>)}
     </div>
     <div className={styles.insightsContent}>
       <section className={styles.trend}>
         <h3>Plays over time</h3>
         {insights.plays===null?
           <div className={styles.emptyPanel}><span aria-hidden="true">▥</span><strong>Listening data unavailable</strong><p>We couldn't load verified plays. No estimates are shown.</p></div>:
         !hasPlays?
           <div className={styles.emptyPanel}><span aria-hidden="true">▥</span><strong>No performance data yet</strong><p>{hasPublished?"Your first qualified play will appear here.":"Publish your first song and share its link. Your listening activity will appear here."}</p></div>:
         !insights.days?
           <div className={styles.emptyPanel}><strong>Detailed trend unavailable</strong><p>The total above is exact, but the full daily trend is not available.</p></div>:
           <div className={styles.plot}>
             <svg viewBox="0 0 568 168" preserveAspectRatio="none" role="img" aria-label={"Recorded qualified plays for the last 30 days: "+insights.plays}>
               {[35,70,105,140].map(y=><line key={y} x1="14" x2="555" y1={y} y2={y} stroke="#ffffff18" strokeWidth="1"/>)}
               <polygon points={"14,140 "+points+" 555,140"} fill="#FF6A0020"/>
               <polyline points={points} fill="none" stroke="#FF6A00" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
             </svg>
             <div className={styles.plotAxis}><span>{startLabel}</span><span>{insightDays}-day listening trend</span><span>{endLabel}</span></div>
           </div>}
       </section>
       <section className={styles.topReleases}>
         <div className={styles.topHeader}><h3>Top releases</h3><Link href="/billboard/submit">Manage releases ↗</Link></div>
         {insights.releases===null?
           <div className={styles.emptyPanel}><strong>Releases unavailable</strong><p>Please try again later.</p></div>:
         !hasPublished?
           <div className={styles.emptyPanel}><span aria-hidden="true">♫</span><strong>No releases yet</strong><p>When your first release is approved and published, it will appear here.</p><Link href={hasProjects?"/billboard/submit":projectHref}>{hasProjects?"Prepare a release":"Create project"} ↗</Link></div>:
         insights.top===null?
           <div className={styles.emptyPanel}><strong>Top releases unavailable</strong><p>We won't rank songs from incomplete listening records.</p></div>:
           <div className={styles.topList}>{insights.top.map((release,index)=><Link key={release.id} href={"/billboard/"+release.id} className={styles.topRow}>
             <span className={styles.topNumber}>{String(index+1).padStart(2,"0")}</span>
             <span className={styles.topCopy}><strong>{release.title}</strong><small>{format(release.plays)} qualified plays · {insightDays} days</small></span>
             <span className={styles.rowArrow} aria-hidden="true">↗</span>
           </Link>)}</div>}
       </section>
     </div>
     <p className={styles.trackingNote}>Plays count qualifying listens: 30 seconds for songs over a minute, or at least half for shorter recordings. Listeners are distinct identifiable listeners, not total plays. New followers means accounts following you whose follow was last saved in this period. All dates use UTC. Profile visits, profile clicks and paid subscribers are not yet tracked as artist statistics. Membership dues and project invoices are not artist earnings; payouts and revenue shares remain unreported until an approved allocation exists.</p>
   </section>
   <section className={styles.actions} aria-label="Quick artist actions">
     <div className={styles.sectionHeading}><div><h2>Quick actions</h2><p>Everything you need to keep making music.</p></div></div>
     <div className={styles.actionGrid}>
       <Link href={hasCurrentProject?"/tracks#project-player":projectHref} className={styles.action}><span aria-hidden="true">▶</span><div><strong>My project tracks</strong><small>Find recordings and listen in {projectName}.</small></div><b aria-hidden="true">↗</b></Link>
       <Link href={hasCurrentProject&&canCreateTrack?"/tracks?upload=1#upload-track":projectHref} className={styles.action}>
         <span aria-hidden="true">♫</span><div><strong>{hasCurrentProject?"Upload to project":"Start a project"}</strong><small>{hasCurrentProject?"Add private recordings and drafts.":"Make a home for your first recording."}</small></div><b aria-hidden="true">↗</b>
       </Link>
       <Link href={hasCurrentProject&&canScheduleSession?"/studio-sessions#schedule-session":projectHref} className={styles.action}>
         <span aria-hidden="true">▦</span><div><strong>Book a session</strong><small>Plan studio time and collaborators.</small></div><b aria-hidden="true">↗</b>
       </Link>
       <Link href={hasProjects?"/billboard/submit":projectHref} className={styles.action}>
         <span aria-hidden="true">◉</span><div><strong>Publish on FACKTS</strong><small>Submit finished music for review.</small></div><b aria-hidden="true">↗</b>
       </Link>
       <Link href={canUploadBeat?"/beats?upload=1#upload-beat":"/beats"} className={styles.action}>
         <span aria-hidden="true">♬</span><div><strong>Beat Library</strong><small>{canUploadBeat?"Explore or upload instrumentals.":"Discover beats and producers."}</small></div><b aria-hidden="true">↗</b>
       </Link>
     </div>
   </section>
   {hasCurrentProject&&<section className={styles.recent} aria-label="Recent project recordings">
     <div className={styles.sectionHeading}><div><h2>Recent recordings</h2><p>Work in progress stays private until released.</p></div><Link href="/tracks">All project music ↗</Link></div>
     {recentUnavailable?<p role="status">Recent recordings are temporarily unavailable.</p>:
       !recent.length?<div className={styles.emptyPanel}><strong>No project tracks yet</strong><p>{projectName} has no registered tracks. Recordings from other projects stay separate.</p><Link href={canCreateTrack?"/tracks?upload=1#upload-track":"/tracks"}>{canCreateTrack?"Add a private recording":"Open project tracks"} ↗</Link></div>:
       <div className={styles.recentGrid}>{recent.slice(0,4).map(row=><Link href={row.href} key={row.id} className={styles.recentRow}>
         <span className={styles.recentArtwork}><img src={row.artwork||"/images/project-001-default-cover.png"} alt="" loading="lazy"/></span>
         <span className={styles.recentCopy}><strong>{row.title}</strong><small>{row.detail}</small><em>{row.status||"In progress"}</em></span>
         <span aria-hidden="true" className={styles.rowArrow}>↗</span>
       </Link>)}</div>}
   </section>}
 </main>;
}
