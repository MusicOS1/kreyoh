import {notFound} from "next/navigation";
import Link from "next/link";
import PublicNavigation from "../../../components/PublicNavigation";
import PublicFooter from "../../../components/PublicFooter";
import {discoveryContent} from "../../../lib/discoveryContent";
import {publicMusicArtists} from "../../../lib/musicArtists";
import {showDateLabel} from "../../../components/ShowsLanding";
import {imageCropStyle} from "../../../lib/heroImageCrop";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
async function loadShow(id:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
 const all=await discoveryContent();
 return all.find(x=>x.id==="music_discovery_"+id&&x.kind==="show")||null;
}
export async function generateMetadata({params}:Props){
 const {id}=await params;
 const item=await loadShow(id);
 return item?{title:item.title+" | FACKTS Music Shows",description:item.description,
  openGraph:{title:item.title,description:item.description,images:item.image?[item.image]:[]}}
  :{title:"Show not found | FACKTS Music"};
}
export default async function ShowDetails({params}:Props){
 const {id}=await params;
 const item=await loadShow(id);
 if(!item)notFound();
 const directory=await publicMusicArtists().catch(()=>[]);
 const names=item.artistNames||[];
 const lineup=names.map(name=>{
  const matches=directory.filter(a=>a.name.trim().toLocaleLowerCase("en")===name.trim().toLocaleLowerCase("en"));
  return {name,artist:matches.length===1?matches[0]:null};
 });
 const programme=(item.programme||"").split("\n").map(s=>s.trim()).filter(Boolean);
 return <>
  <PublicNavigation/>
  <main className="fm-show-detail">
   <nav className="fm-show-back"><Link href="/listen?tab=Shows">← Shows &amp; sessions</Link></nav>
   <header className="fm-show-detail-hero">
    {item.image&&<img src={item.image} alt={item.title+" poster"} className="fm-show-detail-art" style={imageCropStyle(item)}/>}
    <div className="fm-show-detail-overlay" aria-hidden="true"/>
    <div className="fm-show-detail-intro">
     <span className="fm-show-kicker">FACKTS MUSIC / SHOWS &amp; SESSIONS</span>
     <h1>{item.title}</h1>
     {item.eventStart&&<p className="fm-show-detail-date"><time dateTime={item.eventStart}>{showDateLabel(item.eventStart)}</time>{item.eventEnd&&" – "+showDateLabel(item.eventEnd)}</p>}
     {item.venue&&<p className="fm-show-detail-venue">{item.venue}</p>}
     <p className="fm-show-detail-summary">{item.description}</p>
     <div className="fm-show-detail-actions">
      {item.url&&<a className="fm-show-primary-link" href={item.url} target="_blank" rel="noopener noreferrer">Open live / watch <span aria-hidden="true">↗</span></a>}
      <Link href="/listen?tab=Shows" className="fm-show-secondary-link">Explore more shows</Link>
     </div>
    </div>
   </header>
   <div className="fm-show-detail-layout">
    <div className="fm-show-detail-main">
     {lineup.length>0&&<section className="fm-show-detail-section" aria-labelledby="fm-show-artists">
      <span className="fm-show-kicker">ON THE LINEUP</span><h2 id="fm-show-artists">Meet the artists</h2>
      <div className="fm-show-artist-grid">{lineup.map(({name,artist},i)=>{
       const inner=<>
        {artist?.avatar||artist?.hero?<img src={artist.avatar||artist.hero||""} alt="" loading="lazy"/>:<span className="fm-show-artist-fallback">{name.slice(0,1).toUpperCase()}</span>}
        <strong>{name}</strong><small>{artist?"View artist profile ↗":"Featured guest"}</small>
       </>;
       return artist?<Link className="fm-show-artist-card" href={"/creators/"+encodeURIComponent(artist.slug||artist.id)} key={name+i}>{inner}</Link>
        :<article className="fm-show-artist-card" key={name+i}>{inner}</article>;
      })}</div>
     </section>}
     {(item.programmeImage||programme.length>0)&&<section className="fm-show-detail-section" aria-labelledby="fm-show-programme">
      <span className="fm-show-kicker">THE EXPERIENCE</span><h2 id="fm-show-programme">Session programme</h2>
      {item.programmeImage&&<a className="fm-show-programme-image-link" href={item.programmeImage} target="_blank" rel="noopener noreferrer" title="Open full programme picture">
       <img src={item.programmeImage} alt={item.title+" programme poster"} loading="lazy"/>
       <span>Open full programme ↗</span>
      </a>}
      {programme.length>0&&<ol className="fm-show-programme-list">{programme.map((step,i)=><li key={i}>{step}</li>)}</ol>}
     </section>}
    </div>
    <aside className="fm-show-detail-aside">
     <h2>Session information</h2>
     {item.eventStart&&<div><span>STARTS</span><strong>{showDateLabel(item.eventStart)}</strong></div>}
     {item.eventEnd&&<div><span>ENDS</span><strong>{showDateLabel(item.eventEnd)}</strong></div>}
     {item.venue&&<div><span>LOCATION / PLATFORM</span><strong>{item.venue}</strong></div>}
     <div><span>LINEUP</span><strong>{lineup.length?lineup.map(x=>x.name).join(", "):"Details coming soon"}</strong></div>
     {item.url?<a className="fm-show-primary-link" href={item.url} target="_blank" rel="noopener noreferrer">Join or watch ↗</a>:
      <p>Live link has not been published yet. Check the session details for updates.</p>}
    </aside>
   </div>
  </main>
  <PublicFooter/>
 </>;
}
