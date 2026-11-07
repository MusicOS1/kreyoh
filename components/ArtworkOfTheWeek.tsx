import Link from "next/link";
import type {publishedArtworkOfWeek} from "../lib/artworkOfWeek";

type FeaturedArtwork=NonNullable<ReturnType<typeof publishedArtworkOfWeek>>;
export default function ArtworkOfTheWeek({feature}:{feature:FeaturedArtwork}){
 const {entry,artwork,release,href}=feature;
 const details=<>
  <div className="fm-artwork-week-cover"><img src={artwork} alt={release?release.title+" — featured artwork":"Featured FACKTS Music artwork"} loading="lazy"/></div>
  <div className="fm-artwork-week-copy">
   <span className="fm-artwork-week-eyebrow">FACKTS MUSIC / THE ARTWORK SPOTLIGHT</span>
   <h3>{entry.title||"Album Artwork of the Week"}</h3>
   {entry.eyebrow&&<strong className="fm-artwork-week-release">{release?.title||entry.eyebrow}</strong>}
   {entry.description&&<p>{entry.description}</p>}
   {release&&<small>{release.artist_name}</small>}
   <span className="fm-artwork-week-action">{entry.ctaLabel||"Explore the artwork"} <span aria-hidden="true">↗</span></span>
  </div>
 </>;
 return <section className="fs-section fm-artwork-week" aria-label="Album Artwork of the Week">
  <div className="fs-section-heading"><h2>Album Artwork of the Week</h2><span>Curated on FACKTS</span></div>
  {href?<Link className="fm-artwork-week-card" href={href} aria-label={"Explore artwork of the week: "+(release?.title||entry.eyebrow||entry.title)}>
   {details}
  </Link>:<div className="fm-artwork-week-card">{details}</div>}
 </section>;
}
