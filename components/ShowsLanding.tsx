import Link from "next/link";
import type {DiscoveryItem} from "../lib/discoveryContent";
import {imageCropStyle} from "../lib/heroImageCrop";

export function showHref(item:Pick<DiscoveryItem,"id">){
 return "/shows/"+encodeURIComponent(item.id.replace(/^music_discovery_/,""));
}
function showWhen(value?:string){
 if(!value||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return "";
 const date=new Date(value+":00+03:00");
 if(Number.isNaN(date.getTime()))return "";
 return new Intl.DateTimeFormat("en-KE",{day:"numeric",month:"long",year:"numeric",
  hour:"numeric",minute:"2-digit",timeZone:"Africa/Nairobi"}).format(date)+" EAT";
}
export function showDateLabel(value?:string){return showWhen(value);}

export default function ShowsLanding({items}:{items:DiscoveryItem[]}){
 const shows=items.filter(x=>x.kind==="show"&&x.published);
 const featured=shows.find(x=>x.featured)||shows[0];
 const rest=shows.filter(x=>x.id!==featured?.id);
 if(!featured)return <section className="fs-shows-empty">
  <h2>No shows published yet.</h2>
  <p>Live performances, interviews and listening sessions will appear here when published.</p>
  <Link href="/creators" className="fm-show-more">Explore artists ↗</Link>
 </section>;
 return <section className="fm-shows-home" aria-label="FACKTS shows and sessions">
  <div className="fm-shows-heading"><span>FACKTS MUSIC / INSIDE THE SOUND</span>
   <h1>Shows &amp; sessions</h1>
   <p>Live experiences, artist conversations and the stories behind the music.</p>
  </div>
  <Link className="fm-show-feature" href={showHref(featured)} aria-label={"View "+featured.title}>
   {featured.image&&<img src={featured.image} alt="" loading="eager" style={imageCropStyle(featured)}/>}
   <span className="fm-show-feature-shade" aria-hidden="true"/>
   <div className="fm-show-feature-copy">
    <span className="fm-show-kicker">FEATURED {featured.eventStart?"SESSION":"SHOW"}</span>
    <h2>{featured.title}</h2>
    {featured.eventStart&&<time dateTime={featured.eventStart}>{showWhen(featured.eventStart)}</time>}
    {featured.venue&&<span>{featured.venue}</span>}
    <p>{featured.description}</p>
    {Boolean(featured.artistNames?.length)&&<small>Featuring {featured.artistNames!.slice(0,4).join(" · ")}</small>}
    <strong className="fm-show-feature-action">View session details <span aria-hidden="true">↗</span></strong>
   </div>
  </Link>
  {rest.length>0&&<div className="fm-shows-browse">
   <div><span>EXPLORE THE SESSIONS</span><h2>More from FACKTS</h2></div>
   <div className="fm-show-cards">{rest.map(item=><Link key={item.id} href={showHref(item)} className="fm-show-card">
    {item.image?<img src={item.image} alt="" loading="lazy" style={imageCropStyle(item)}/>:<div className="fm-show-card-placeholder">FACKTS MUSIC</div>}
    <div><span>{item.eventStart?showWhen(item.eventStart):"SESSION / FACKTS"}</span>
     <h3>{item.title}</h3><p>{item.description}</p><b>See details ↗</b></div>
   </Link>)}</div>
  </div>}
 </section>;
}
